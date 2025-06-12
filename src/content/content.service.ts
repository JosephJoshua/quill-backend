import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { Content, ProcessingStatus } from './entity/content.entity';
import { AdminCreateContentDto } from './dto/admin-create-content.dto';
import { User } from '../user/entity/user.entity';
import {
  AZURE_BLOB_SERVICE_CLIENT,
  AZURE_SEARCH_CLIENT,
} from '../azure/azure.module';
import { v4 as uuidv4 } from 'uuid';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { UserToContent } from './entity/user-to-content.entity';
import { getErrorMessage, getErrorStack } from '../util/get-error-message';
import { IndexingJobData } from './indexing.processor';
import { CONTENT_INDEXING_QUEUE } from '../queue/queue.module';
import { ContentListQueryDto } from './dto/content-list-query.dto';
import { PaginatedResponse } from '../util/paginated-response.interface';
import {
  ContentDetailResponseDto,
  ContentSummaryResponseDto,
} from './dto/content-response.dto';
import { AiService } from '../ai/ai.service';
import { SearchClient } from '@azure/search-documents';
import { SearchableContent } from './interface/searchable-content.interface';
import { plainToInstance } from 'class-transformer';
import { AdminContentListQueryDto } from './dto/admin-content-list-query.dto';
import { AdminUpdateContentDto } from './dto/admin-update-content.dto';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);
  private readonly containerClient: ContainerClient;

  constructor(
    @Inject()
    private readonly aiService: AiService,
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
    @InjectRepository(UserToContent)
    private userToContentRepository: Repository<UserToContent>,
    private readonly dataSource: DataSource,
    @Inject(AZURE_BLOB_SERVICE_CLIENT)
    private blobServiceClient: BlobServiceClient,
    @Inject(AZURE_SEARCH_CLIENT)
    private searchClient: SearchClient<SearchableContent>,
    @InjectQueue(CONTENT_INDEXING_QUEUE)
    private indexingQueue: Queue<IndexingJobData>,
    private configService: ConfigService,
  ) {
    const containerName =
      this.configService.get<string>('azure.storage.containerName') ?? '';

    this.containerClient =
      this.blobServiceClient.getContainerClient(containerName);
  }

  async getRecommendations(
    userId: string,
  ): Promise<ContentSummaryResponseDto[]> {
    // TODO: Consider using a more sophisticated method
    const lastInteraction = await this.userToContentRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (!lastInteraction) {
      // If the user has no history, we can't generate recommendations yet.
      return [];
    }

    const sourceContentId = lastInteraction.contentId;
    const chunks = await this.searchClient.search('*', {
      filter: `contentId eq '${sourceContentId}'`,
      select: ['contentVector'],
    });

    const vectors: number[][] = [];
    for await (const chunk of chunks.results) {
      if (chunk.document.contentVector) {
        vectors.push(chunk.document.contentVector);
      }
    }

    if (vectors.length === 0) return [];

    // Calculate the average "centroid" vector
    const averageVector = vectors[0].map(
      (_, i) => vectors.reduce((sum, vec) => sum + vec[i], 0) / vectors.length,
    );

    const similarResults = await this.searchClient.search('', {
      vectorSearchOptions: {
        queries: [
          {
            vector: averageVector,
            kNearestNeighborsCount: 10,
            fields: ['contentVector'],
            kind: 'vector',
          },
        ],
      },
      select: ['contentId'],
    });

    const readingHistory = await this.userToContentRepository.find({
      where: { userId },
      select: ['contentId'],
    });
    const readContentIds = new Set(readingHistory.map((h) => h.contentId));

    const recommendedContentIds = new Set<string>();
    for await (const result of similarResults.results) {
      // Filter out content the user has already read (including the source).
      if (!readContentIds.has(result.document.contentId)) {
        recommendedContentIds.add(result.document.contentId);
      }
    }

    if (recommendedContentIds.size === 0) return [];

    const contentItems = await this.contentRepository.findBy({
      id: In(Array.from(recommendedContentIds)),
    });

    return plainToInstance(ContentSummaryResponseDto, contentItems);
  }

  async find(
    query: ContentListQueryDto,
  ): Promise<PaginatedResponse<ContentSummaryResponseDto>> {
    if (query.q && query.q.trim().length > 0) {
      // If a search query 'q' is present, use Azure AI Search.
      return this.executeSearch(query);
    } else {
      // Otherwise, use the standard PostgreSQL filtering.
      return this.executeFilter(query);
    }
  }

  async findOne(id: string): Promise<ContentDetailResponseDto> {
    const content = await this.contentRepository.findOneBy({
      id,
      processingStatus: ProcessingStatus.COMPLETED, // Ensure user can't access unprocessed content
    });

    if (!content) {
      throw new NotFoundException(
        `Content with ID "${id}" not found or is not active.`,
      );
    }

    // Map entity to our detailed DTO
    return plainToInstance(ContentDetailResponseDto, content);
  }

  async findAllForUser(userId: string): Promise<Content[]> {
    return (await this.userToContentRepository.find({ where: { userId } })).map(
      (userToContent) => userToContent.content,
    );
  }

  async addToUserContent(contentId: string, userId: string) {
    const existingUserToContent = await this.userToContentRepository.findOne({
      where: { contentId, userId },
    });

    if (existingUserToContent) {
      return;
    }

    const newUserToContent = this.userToContentRepository.create({
      userId,
      contentId,
    });

    await this.userToContentRepository.save(newUserToContent);
  }

  async uploadAndCreateContent(
    file: Express.Multer.File,
    createContentDto: AdminCreateContentDto,
    user: Omit<User, 'passwordHash'>,
  ): Promise<Content> {
    const blobId = uuidv4();
    const blobName = `${user.id}/${blobId}-${file.originalname}`;
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    try {
      this.logger.log(`Uploading file ${file.originalname} to ${blobName}`);

      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: file.mimetype },
      });

      const blobUrl = blockBlobClient.url;
      this.logger.log(`File uploaded to ${blobUrl}`);

      const newContent = this.contentRepository.create({
        ...createContentDto,
        blobUrl: blobUrl,
        blobName: blobName,
        fileType: file.mimetype,
        processingStatus: ProcessingStatus.PENDING,
        rawText: '',
      });

      const savedContent = await this.contentRepository.save(newContent);
      this.logger.log(`Content metadata saved with ID: ${savedContent.id}`);

      try {
        const job = await this.indexingQueue.add(
          'process-content',
          { contentId: savedContent.id },
          {
            removeOnComplete: 1000,
            removeOnFail: 5000,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
        );

        this.logger.log(
          `Added indexing job ${job.id} to queue ${CONTENT_INDEXING_QUEUE} for content ID: ${savedContent.id}`,
        );
      } catch (queueError) {
        this.logger.error(
          `Failed to add job to queue ${CONTENT_INDEXING_QUEUE} for content ${savedContent.id}: ${getErrorMessage(queueError)}`,
          getErrorStack(queueError),
        );

        await this.contentRepository.update(savedContent.id, {
          processingStatus: ProcessingStatus.FAILED,
        });

        throw new InternalServerErrorException(
          'Failed to queue content for indexing.',
        );
      }

      return savedContent;
    } catch (error) {
      this.logger.error(
        `Failed to upload or save content for ${file.originalname}: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );

      throw new InternalServerErrorException(
        'Failed to process content upload.',
      );
    }
  }

  async findAll(query: AdminContentListQueryDto) {
    const { page, limit, status } = query;
    const qb = this.contentRepository.createQueryBuilder('content');

    if (status) {
      qb.where('content.processingStatus = :status', { status });
    }

    qb.orderBy('content.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async updateContentMetadata(id: string, updateDto: AdminUpdateContentDto) {
    const result = await this.contentRepository.update(id, updateDto);
    if (result.affected === 0)
      throw new NotFoundException(`Content with ID ${id} not found.`);

    return this.contentRepository.findOneBy({ id });
  }

  async reprocessContent(id: string) {
    const content = await this.contentRepository.findOneBy({ id });
    if (!content)
      throw new NotFoundException(`Content with ID ${id} not found.`);

    if (content.processingStatus === ProcessingStatus.PROCESSING) {
      throw new ConflictException('Content is already being processed.');
    }

    await this.indexingQueue.add('process-content', { contentId: id });
    await this.contentRepository.update(id, {
      processingStatus: ProcessingStatus.PENDING,
    });

    return { message: 'Content has been queued for reprocessing.' };
  }

  async deleteContent(id: string): Promise<void> {
    const content = await this.contentRepository.findOneBy({ id });
    if (!content)
      throw new NotFoundException(`Content with ID ${id} not found.`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete from Azure AI Search
      const searchDocsToDelete = new Array<SearchableContent>();
      const results = await this.searchClient.search('*', {
        filter: `contentId eq '${id}'`,
      });

      for await (const result of results.results) {
        searchDocsToDelete.push(result.document);
      }

      if (searchDocsToDelete.length > 0) {
        await this.searchClient.deleteDocuments(searchDocsToDelete);
      }

      // Delete from Azure Blob Storage
      if (content.blobName) {
        const blockBlobClient = this.containerClient.getBlockBlobClient(
          content.blobName,
        );

        await blockBlobClient.deleteIfExists();
      }

      // Delete from PostgreSQL (within the transaction)
      await queryRunner.manager.delete(Content, { id });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        `Failed to delete content: ${getErrorMessage(error)}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  private async executeSearch(
    query: ContentListQueryDto,
  ): Promise<PaginatedResponse<ContentSummaryResponseDto>> {
    const { q, page, limit, genre, language, difficultyLevel } = query;
    if (!q || q.trim().length === 0) {
      throw new Error('Search query "q" is required.');
    }

    const queryVector = await this.aiService.getEmbedding(q);
    const filters: string[] = [
      `processingStatus eq '${ProcessingStatus.COMPLETED}'`,
    ];

    if (genre) filters.push(`genre eq '${genre}'`);
    if (language) filters.push(`language eq '${language}'`);
    if (difficultyLevel)
      filters.push(`difficultyLevel eq '${difficultyLevel}'`);

    const searchResults = await this.searchClient.search(q, {
      vectorSearchOptions: {
        queries: [
          {
            vector: queryVector,
            kNearestNeighborsCount: 5,
            fields: ['contentVector'],
            kind: 'vector',
          },
        ],
      },
      queryType: 'semantic',
      semanticSearchOptions: { configurationName: 'default' },
      filter: filters.join(' and '),
      top: 50,
      select: ['contentId'],
    });

    const uniqueContentIds = new Set<string>();
    for await (const result of searchResults.results) {
      uniqueContentIds.add(result.document.contentId);
    }

    if (uniqueContentIds.size === 0) {
      return { data: [], meta: { total: 0, page, limit, lastPage: 0 } };
    }

    const [entities, total] = await this.contentRepository.findAndCount({
      where: { id: In(Array.from(uniqueContentIds)) },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = plainToInstance(ContentSummaryResponseDto, entities);
    return {
      data,
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  private async executeFilter(
    query: ContentListQueryDto,
  ): Promise<PaginatedResponse<ContentSummaryResponseDto>> {
    const { page, limit, genre, language, difficultyLevel, sortBy } = query;
    const qb = this.contentRepository.createQueryBuilder('content');

    qb.where('content.processingStatus = :status', {
      status: ProcessingStatus.COMPLETED,
    });

    if (genre) {
      qb.andWhere('content.genre = :genre', { genre });
    }

    if (language) {
      qb.andWhere('content.language = :language', { language });
    }

    if (difficultyLevel) {
      qb.andWhere('content.difficultyLevel = :difficultyLevel', {
        difficultyLevel,
      });
    }

    switch (sortBy) {
      case 'difficulty_asc':
        qb.orderBy('content.difficultyScore', 'ASC');
        break;
      case 'difficulty_desc':
        qb.orderBy('content.difficultyScore', 'DESC');
        break;
      case 'newest':
      default:
        qb.orderBy('content.createdAt', 'DESC');
        break;
    }

    qb.skip((page - 1) * limit).take(limit);

    const [entities, total] = await qb.getManyAndCount();
    const data = plainToInstance(ContentSummaryResponseDto, entities);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }
}
