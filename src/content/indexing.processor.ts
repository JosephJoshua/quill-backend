import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { SearchClient } from '@azure/search-documents';
import { Content, ProcessingStatus } from './entity/content.entity';
import { AiService } from '../ai/ai.service';
import {
  AZURE_BLOB_SERVICE_CLIENT,
  AZURE_SEARCH_CLIENT,
} from '../azure/azure.module';
import { SearchableContent } from './interface/searchable-content.interface';
import { getErrorMessage, getErrorStack } from '../util/get-error-message';
import { pRateLimit } from 'p-ratelimit';
import { CONTENT_INDEXING_QUEUE } from '../queue/queue.module';

export interface IndexingJobData {
  contentId: string;
}

@Processor(CONTENT_INDEXING_QUEUE, {
  concurrency: 2,
})
export class IndexingProcessor extends WorkerHost {
  private readonly logger = new Logger(IndexingProcessor.name);
  private readonly containerClient: ContainerClient;

  constructor(
    @InjectRepository(Content) private contentRepository: Repository<Content>,
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
    @Inject(AZURE_BLOB_SERVICE_CLIENT)
    private blobServiceClient: BlobServiceClient,
    @Inject(AZURE_SEARCH_CLIENT)
    private searchClient: SearchClient<SearchableContent>,
  ) {
    super();

    const containerName =
      this.configService.get<string>('azure.storage.containerName') ?? '';

    this.containerClient =
      this.blobServiceClient.getContainerClient(containerName);
  }

  async process(job: Job<IndexingJobData>): Promise<void> {
    if (job.id === undefined) {
      this.logger.error(`Job doesn't have an ID. Cannot process indexing job.`);
      return;
    }

    const { contentId } = job.data;
    this.logger.log(
      `Processing indexing job ${job.id} for content ID: ${contentId}`,
    );

    const content = await this.contentRepository.findOneBy({ id: contentId });
    if (!content) {
      this.logger.error(
        `Job ${job.id}: Content ID ${contentId} not found in database. Skipping.`,
      );

      return;
    }

    if (content.processingStatus === ProcessingStatus.COMPLETED) {
      this.logger.warn(
        `Job ${job.id}: Content ID ${contentId} is already indexed. Skipping.`,
      );

      return;
    }

    if (content.processingStatus === ProcessingStatus.PROCESSING) {
      this.logger.warn(
        `Job ${job.id}: Content ID ${contentId} is already being indexed by another worker? Skipping.`,
      );

      return;
    }

    try {
      await this.contentRepository.update(contentId, {
        processingStatus: ProcessingStatus.PROCESSING,
      });

      const blobContent = await this.downloadBlob(content.blobName, job.id);
      const extractedText = await this.extractText(
        blobContent,
        content.fileType,
        job.id,
      );

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('Extracted text is empty.');
      }

      this.logger.log(
        `Job ${job.id}: Extracted text length: ${extractedText.length}`,
      );

      // --- 1. AI analysis ---
      this.logger.log(`Job ${job.id}: Starting full-text AI analysis...`);
      const analysisResults =
        await this.aiService.analyzeContentForPipeline(extractedText);
      this.logger.log(`Job ${job.id}: AI analysis complete.`);
      await job.updateProgress(40);

      // --- 2. Generate embeddings ---
      const chunks = this.chunkText(extractedText);
      this.logger.log(
        `Job ${job.id}: Extracted text chunked into ${chunks.length} parts.`,
      );

      const documents: SearchableContent[] = [];
      const limit = pRateLimit({ interval: 1000, rate: 10, concurrency: 5 });

      await Promise.all(
        chunks.map((chunk, i) =>
          limit(async () => {
            const embeddingVector = await this.aiService
              .getEmbedding(chunk)
              .catch((err) => {
                this.logger.warn(
                  `Failed to get embedding for chunk ${i}: ${getErrorMessage(err)}`,
                );
                return null;
              });

            documents.push({
              id: `${content.id}_chunk_${i}`.replace(/[^a-zA-Z0-9_.-]/g, '_'),
              contentId: content.id,
              title: content.title,
              author: content.author,
              genre: content.genre,
              language: content.language,
              difficultyLevel: analysisResults.difficultyLevel,
              chunkText: chunk,
              contentVector: embeddingVector ?? undefined,
            });
          }),
        ),
      );

      this.logger.log(
        `Job ${job.id}: Generated embeddings for all ${chunks.length} chunks.`,
      );
      await job.updateProgress(70);

      // --- 3. Upload to Azure AI Search ---
      this.logger.log(
        `Job ${job.id}: Uploading ${documents.length} documents to Azure AI Search.`,
      );
      await this.searchClient.mergeOrUploadDocuments(documents);
      this.logger.log(`Job ${job.id}: Successfully uploaded documents.`);

      await job.updateProgress(90);

      // --- 4. Update Content record ---
      this.logger.log(
        `Job ${job.id}: Saving all generated data to PostgreSQL.`,
      );
      await this.contentRepository.update(contentId, {
        rawText: extractedText,
        difficultyAnalysis: analysisResults.difficultyAnalysis,
        difficultyLevel: analysisResults.difficultyLevel,
        difficultyScore: analysisResults.difficultyAnalysis.numericScore,
        linguisticAnalysis: analysisResults.linguisticAnalysis,
        comprehensionQuestions: analysisResults.comprehensionQuestions,
        processingStatus: ProcessingStatus.COMPLETED,
      });

      await job.updateProgress(100);

      this.logger.log(
        `Job ${job.id}: Successfully completed indexing for content ID: ${contentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Job ${job.id}: Indexing failed for content ID: ${contentId}: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );

      try {
        await this.contentRepository.update(contentId, {
          processingStatus: ProcessingStatus.FAILED,
        });
      } catch (updateError) {
        this.logger.error(
          `Job ${job.id}: Failed to update status to FAILED for content ID ${contentId}: ${getErrorMessage(updateError)}`,
        );
      }

      throw error;
    }
  }

  private async downloadBlob(
    blobName: string,
    jobId: string | number,
  ): Promise<Buffer> {
    try {
      const blobClient = this.containerClient.getBlobClient(blobName);
      this.logger.debug(`Job ${jobId}: Downloading blob: ${blobName}`);

      const downloadResponse = await blobClient.downloadToBuffer();
      this.logger.debug(
        `Job ${jobId}: Downloaded blob: ${blobName} (${(downloadResponse.length / 1024).toFixed(2)} KB)`,
      );

      return downloadResponse;
    } catch (error) {
      this.logger.error(
        `Job ${jobId}: Failed to download blob ${blobName}: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );

      if (error instanceof NotFoundException) {
        throw new Error(`Blob ${blobName} not found.`);
      }

      throw new Error(`Failed to download blob ${blobName}.`);
    }
  }

  private async extractText(
    buffer: Buffer,
    mimeType: string,
    jobId: string | number,
  ): Promise<string> {
    this.logger.debug(
      `Job ${jobId}: Extracting text from buffer with mimeType: ${mimeType}`,
    );

    if (mimeType.includes('pdf') || mimeType.includes('image')) {
      try {
        this.logger.debug(`Job ${jobId}: Parsing PDF or image...`);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const { extractText: scribeExtractText } = await import(
          'scribe.js-ocr'
        );

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const data = (await scribeExtractText([buffer], ['eng'], 'txt', {
          mode: 'quality',
        })) as string;

        this.logger.debug(
          `Job ${jobId}: Extracted ${data.length} chars from PDF or image.`,
        );

        return data;
      } catch (error) {
        this.logger.error(
          `Job ${jobId}: Failed to parse PDF or image: ${getErrorMessage(error)}`,
          getErrorStack(error),
        );

        throw new Error('Failed to extract text from PDF or image.');
      }
    } else if (mimeType.includes('text') || mimeType.includes('plain')) {
      this.logger.debug(`Job ${jobId}: Reading text directly.`);
      return buffer.toString('utf-8');
    } else {
      this.logger.warn(
        `Job ${jobId}: Unsupported mime type for text extraction: ${mimeType}`,
      );

      throw new Error(`Unsupported file type for text extraction: ${mimeType}`);
    }
  }

  private chunkText(text: string, chunkSize = 1500, overlap = 150): string[] {
    text = text.replace(/\s+/g, ' ').trim();

    const chunks: string[] = [];
    if (!text) return chunks;

    let startIndex = 0;
    while (startIndex < text.length) {
      let endIndex = Math.min(startIndex + chunkSize, text.length);

      const boundarySearchStart = Math.max(
        startIndex + chunkSize - overlap,
        startIndex,
      );

      const sentenceEndMatch = text
        .substring(boundarySearchStart, endIndex)
        .match(/.*[.?!]\s/);

      if (sentenceEndMatch && sentenceEndMatch.index !== undefined) {
        endIndex =
          boundarySearchStart +
          sentenceEndMatch.index +
          sentenceEndMatch[0].length;
      }

      endIndex = Math.min(endIndex, text.length);

      const chunk = text.slice(startIndex, endIndex).trim();
      if (chunk) {
        chunks.push(chunk);
      }

      startIndex = Math.max(startIndex + overlap, endIndex - overlap);
      if (startIndex >= text.length || endIndex === text.length) break;
    }

    return chunks;
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<IndexingJobData>) {
    this.logger.log(
      `Job ${job.id} (Content: ${job.data?.contentId}) completed successfully.`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<IndexingJobData>, error: Error) {
    this.logger.error(
      `Job ${job.id} (Content: ${job.data?.contentId}) failed after ${job.attemptsMade} attempts: ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job<IndexingJobData>, progress: number | object) {
    const progressStr =
      typeof progress === 'number' ? progress : JSON.stringify(progress);

    this.logger.debug(
      `Job ${job.id} (Content: ${job.data?.contentId}) progress: ${progressStr}%`,
    );
  }
}
