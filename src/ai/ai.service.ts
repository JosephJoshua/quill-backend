import {
  Injectable,
  Inject,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SearchClient, VectorQuery } from '@azure/search-documents';
import { AZURE_SEARCH_CLIENT } from '../azure/azure.module';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getErrorMessage, getErrorStack } from 'src/util/get-error-message';
import {
  DifficultyAnalysis,
  LinguisticAnalysis,
  ComprehensionQuestion,
  MultipleChoiceQuestion,
  OpenEndedQuestion,
  CEFRLevel,
} from '../content/content.entity';
import { SearchableContent } from '../content/interface/searchable-content.interface';
import { TutorChatRequestDto } from './dto/tutor-chat-request.dto';
import {
  AI_PROMPTS,
  buildLanguageAwareAiTutorSystemPrompt,
} from './ai.prompts';
import { Dialogue } from './dialogue.entity';
import { UserProficiencyAssessmentDto } from './dto/user-proficiency-assessment.dto';
import { ContentAnalysisResultDto } from './dto/content-analysis-result.dto';
import { TutorChatResponseDto } from './dto/tutor-chat-response.dto';
import { UserMemoryProfile } from '../user/user.entity';
import { Conversation } from './conversation.entity';
import { ConversationSummaryDto } from './dto/conversation-summary.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { CONVERSATION_SUMMARIZATION_QUEUE } from '../queue/queue.module';
import { Queue } from 'bullmq';
import { ConversationSummarizationJobData } from './conversation-summarization.processor';
import { UserWithoutPasswordDto } from '../user/dto/user.dto';
import { OpenEndedAnswerVerificationDto } from './dto/open-ended-answer-verification.dto';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const SUMMARY_TURN_THRESHOLD = 10; // Number of turns before summarization is triggered

@Injectable()
export class AiService {
  public readonly logger = new Logger(AiService.name);

  private readonly embeddingModel = 'openai/text-embedding-ada-002';
  private readonly chatModel = 'mistralai/mistral-7b-instruct';
  private readonly analysisModel = 'openai/gpt-4o-mini';
  private readonly summarizationModel = 'openai/gpt-4o-mini';
  private readonly synthesisModel = 'openai/gpt-4o-mini';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectQueue(CONVERSATION_SUMMARIZATION_QUEUE)
    private conversationSummarizationQueue: Queue<ConversationSummarizationJobData>,
    @Inject(AZURE_SEARCH_CLIENT)
    private searchClient: SearchClient<SearchableContent>,
    @InjectRepository(Dialogue)
    private dialogueRepository: Repository<Dialogue>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
  ) {}

  private async makeOpenRouterRequest<T>(
    payload: Record<string, any>,
  ): Promise<T> {
    const apiKey = this.configService.get<string>('openRouter.apiKey');
    const referrer = this.configService.get<string>('openRouter.referrer');
    const siteName = this.configService.get<string>('openRouter.siteName');

    if (!apiKey) {
      this.logger.error('OpenRouter API key is not configured.');
      throw new InternalServerErrorException('AI service is not configured.');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<T>(
          'https://openrouter.ai/api/v1/chat/completions',
          payload,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'HTTP-Referer': referrer ?? 'http://localhost:3000',
              'X-Title': siteName ?? 'Quill',
              'Content-Type': 'application/json',
            },
            timeout: 90000,
          },
        ),
      );

      return response.data;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const detail: string =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.response?.data?.error?.message || getErrorMessage(error);

      this.logger.error(
        `Error calling OpenRouter for model ${payload.model}: ${detail}`,
        getErrorStack(error),
      );

      throw new InternalServerErrorException(
        `AI interaction failed: ${detail}`,
      );
    }
  }

  private parseJsonResponse<T>(
    jsonString: string,
    validator: (obj: any) => obj is T,
  ): T {
    try {
      // Clean up potential markdown code fences
      const cleanedString = jsonString.replace(/^```json\s*|\s*```$/g, '');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsed: any = JSON.parse(cleanedString);
      if (validator(parsed)) {
        return parsed;
      } else {
        this.logger.error('Parsed JSON failed validation', parsed);
        throw new Error('Parsed JSON has an invalid structure.');
      }
    } catch (error) {
      this.logger.error(
        `Failed to parse or validate JSON response: ${getErrorMessage(error)}`,
        `Raw Response: ${jsonString}`,
      );

      throw new InternalServerErrorException(
        'AI returned data in an unexpected format.',
      );
    }
  }

  private async getOrCreateConversation(
    chatRequest: TutorChatRequestDto,
    userId: string,
    contentId: string,
  ): Promise<Conversation> {
    if (chatRequest.conversationId) {
      const conversation = await this.conversationRepository.findOneBy({
        id: chatRequest.conversationId,
        userId,
      });

      if (conversation) return conversation;
    }

    const newConversation = this.conversationRepository.create({
      userId,
      contentId,
    });

    return this.conversationRepository.save(newConversation);
  }

  private async getHistoryMessages(
    conversation: Conversation,
  ): Promise<ChatMessage[]> {
    const historyMessages: ChatMessage[] = [];
    if (conversation.summary) {
      historyMessages.push({
        role: 'system',
        content: `[PREVIOUSLY IN THIS CONVERSATION]:\n${conversation.summary}`,
      });
    }

    const recentTurns = await this.dialogueRepository.find({
      where: { conversationId: conversation.id },
      order: { timestamp: 'DESC' },
      take: 5,
    });

    for (const turn of recentTurns.reverse()) {
      historyMessages.push({ role: 'user', content: turn.userMessage });
      historyMessages.push({ role: 'assistant', content: turn.aiResponse });
    }

    return historyMessages;
  }

  private async triggerMemoryJobs(conversationId: string) {
    const turnCount = await this.dialogueRepository.count({
      where: { conversationId },
    });

    if (
      turnCount >= SUMMARY_TURN_THRESHOLD &&
      turnCount % SUMMARY_TURN_THRESHOLD === 0
    ) {
      await this.conversationSummarizationQueue.add('summarize-conversation', {
        conversationId,
      });
    }
  }

  /**
   * Generates an embedding vector for a given text.
   * @param text The input text to embed.
   * @returns A promise that resolves to an array of numbers representing the vector.
   */
  async getEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new BadRequestException(
        'Cannot generate embedding for empty text.',
      );
    }

    const apiKey = this.configService.get<string>('openRouter.apiKey');
    const referrer = this.configService.get<string>('openRouter.referrer');
    const siteName = this.configService.get<string>('openRouter.siteName');

    try {
      const response = await firstValueFrom(
        this.httpService.post<{ data: { embedding: number[] }[] }>(
          'https://openrouter.ai/api/v1/embeddings',
          { model: this.embeddingModel, input: text },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'HTTP-Referer': referrer ?? 'http://localhost:3000',
              'X-Title': siteName ?? 'Quill',
            },
            timeout: 20000,
          },
        ),
      );

      const embedding = response.data?.data?.[0]?.embedding;
      if (!embedding) {
        throw new InternalServerErrorException(
          'Invalid embedding response structure.',
        );
      }
      return embedding;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const detail: string =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.response?.data?.error?.message || getErrorMessage(error);

      this.logger.error(
        `Error getting embedding from OpenRouter: ${detail}`,
        getErrorStack(error),
      );

      throw new InternalServerErrorException(
        `Failed to generate embedding: ${detail}`,
      );
    }
  }

  /**
   * Performs the full suite of content analysis for the admin pipeline.
   * This is intended to be called by an async BullMQ worker.
   * @param rawText The full raw text of the content to analyze.
   * @returns An object containing all AI-generated analysis data.
   */
  async analyzeContentForPipeline(
    rawText: string,
  ): Promise<ContentAnalysisResultDto> {
    this.logger.log('Starting full content analysis pipeline...');

    const [difficultyResult, linguisticResult, questionsResult] =
      await Promise.all([
        this.makeOpenRouterRequest<{
          choices: { message: { content: string } }[];
        }>({
          model: this.analysisModel,
          messages: [
            { role: 'system', content: AI_PROMPTS.difficultyAssessment },
            { role: 'user', content: rawText },
          ],
          response_format: { type: 'json_object' },
        }),
        this.makeOpenRouterRequest<{
          choices: { message: { content: string } }[];
        }>({
          model: this.analysisModel,
          messages: [
            { role: 'system', content: AI_PROMPTS.linguisticAnalysis },
            { role: 'user', content: rawText },
          ],
          response_format: { type: 'json_object' },
        }),
        this.makeOpenRouterRequest<{
          choices: { message: { content: string } }[];
        }>({
          model: this.analysisModel,
          messages: [
            { role: 'system', content: AI_PROMPTS.questionGeneration },
            { role: 'user', content: rawText },
          ],
          response_format: { type: 'json_object' },
        }),
      ]);

    type DifficultyAnalysisWithLevel = DifficultyAnalysis & {
      cefrLevel: CEFRLevel;
    };

    const { cefrLevel: difficultyLevel, ...difficultyAnalysis } =
      this.parseJsonResponse<DifficultyAnalysisWithLevel>(
        difficultyResult.choices[0].message.content,
        (o): o is DifficultyAnalysisWithLevel => {
          if (typeof o !== 'object') return false;

          const obj = o as Record<string, any>;
          return (
            typeof obj.cefrLevel === 'string' &&
            obj.cefrLevel in CEFRLevel &&
            typeof obj.numericScore === 'number' &&
            typeof obj.justification === 'string' &&
            Array.isArray(obj.keyChallenges)
          );
        },
      );

    const linguisticAnalysis = this.parseJsonResponse<LinguisticAnalysis>(
      linguisticResult.choices[0].message.content,
      (o): o is LinguisticAnalysis => {
        if (typeof o !== 'object') return false;

        const obj = o as Record<string, any>;
        return (
          Array.isArray(obj.keyVocabulary) &&
          Array.isArray(obj.keyGrammar) &&
          Array.isArray(obj.idiomaticExpressions)
        );
      },
    );

    const rawQuestions = this.parseJsonResponse<{
      multipleChoice: any[];
      openEnded: any[];
    }>(
      questionsResult.choices[0].message.content,
      (o): o is { multipleChoice: any[]; openEnded: any[] } => {
        if (typeof o !== 'object') return false;

        const obj = o as Record<string, any>;
        return (
          Array.isArray(obj.multipleChoice) && Array.isArray(obj.openEnded)
        );
      },
    );

    const comprehensionQuestions: ComprehensionQuestion[] = [
      ...rawQuestions.multipleChoice.map<MultipleChoiceQuestion>(
        (q: MultipleChoiceQuestion) => ({
          ...q,
          id: crypto.randomUUID(),
          questionType: 'multipleChoice',
        }),
      ),
      ...rawQuestions.openEnded.map<OpenEndedQuestion>(
        (q: OpenEndedQuestion) => ({
          ...q,
          id: crypto.randomUUID(),
          questionType: 'openEnded',
        }),
      ),
    ];

    this.logger.log('Full content analysis pipeline completed successfully.');

    return {
      difficultyLevel,
      difficultyAnalysis,
      linguisticAnalysis,
      comprehensionQuestions,
    };
  }

  /**
   * Handles the AI Tutor chat feature using a RAG architecture.
   * @param user The user making the request.
   * @param chatRequest The DTO containing the user's message and context.
   * @returns The AI's response and the ID of the new dialogue turn.
   */
  async getTutorResponse(
    user: UserWithoutPasswordDto,
    chatRequest: TutorChatRequestDto,
  ): Promise<TutorChatResponseDto> {
    const { message, contentId } = chatRequest;

    const nativeLangs = user.nativeLanguages || ['English'];
    const targetLang = user.targetLanguage || 'Japanese';

    const conversation = await this.getOrCreateConversation(
      chatRequest,
      user.id,
      contentId,
    );

    const systemPrompt = buildLanguageAwareAiTutorSystemPrompt(
      nativeLangs,
      targetLang,
    );

    const getContextText = async () => {
      const queryVector = await this.getEmbedding(message);
      const vectorQuery: VectorQuery<SearchableContent> = {
        vector: queryVector,
        kNearestNeighborsCount: 3,
        fields: ['contentVector'],
        kind: 'vector',
      };

      const searchResults = await this.searchClient.search(message, {
        filter: `contentId eq '${contentId}'`,
        vectorSearchOptions: { queries: [vectorQuery] },
        top: 3,
        select: ['chunkText'],
      });

      const contextChunks: string[] = [];
      for await (const result of searchResults.results) {
        contextChunks.push(result.document.chunkText);
      }

      this.logger.log(
        `Retrieved ${contextChunks.length} context chunks for RAG.`,
      );

      return contextChunks.length > 0
        ? `--- CONTEXT FROM THE BOOK ---\n${contextChunks.join('\n\n')}\n--- END CONTEXT ---`
        : 'No specific context from the book was retrieved for this query.';
    };

    const [contextText, historyMessages] = await Promise.all([
      getContextText(),
      this.getHistoryMessages(conversation),
    ]);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      {
        role: 'user',
        content: `${contextText}\n\nUser Question: ${message}`.trim(),
      },
    ];

    const responseData = await this.makeOpenRouterRequest<{
      choices: { message: { content: string } }[];
    }>({
      model: this.chatModel,
      messages: messages,
    });

    const aiResponseContent = responseData.choices[0].message.content.trim();

    const newDialogue = this.dialogueRepository.create({
      conversationId: conversation.id,
      userMessage: message,
      aiResponse: aiResponseContent,
      openRouterModel: this.chatModel,
    });

    await this.dialogueRepository.save(newDialogue);
    await this.triggerMemoryJobs(conversation.id);

    return {
      response: aiResponseContent,
      dialogueId: newDialogue.id,
      conversationId: conversation.id,
    };
  }

  async getConversationSummary(
    transcript: string,
  ): Promise<ConversationSummaryDto> {
    const response = await this.makeOpenRouterRequest<{
      choices: { message: { content: string } }[];
    }>({
      model: this.summarizationModel,
      messages: [
        { role: 'system', content: AI_PROMPTS.conversationSummarization },
        { role: 'user', content: transcript },
      ],
      response_format: { type: 'json_object' },
    });

    return this.parseJsonResponse<ConversationSummaryDto>(
      response.choices[0].message.content,
      (o: any): o is ConversationSummaryDto => {
        if (typeof o !== 'object') return false;

        const obj = o as Record<string, any>;
        return typeof obj.title === 'string' && typeof obj.summary === 'string';
      },
    );
  }

  async synthesizeLongTermMemory(
    existingProfile: UserMemoryProfile | undefined,
    transcripts: string,
    targetLang: string,
    nativeLangs: string[],
  ): Promise<UserMemoryProfile> {
    const prompt = AI_PROMPTS.longTermMemorySynthesis(targetLang, nativeLangs);
    const context = `EXISTING USER PROFILE:\n${JSON.stringify(existingProfile || {}, null, 2)}\n\nRECENT CONVERSATION TRANSCRIPTS:\n${transcripts}`;

    const response = await this.makeOpenRouterRequest<{
      choices: { message: { content: string } }[];
    }>({
      model: this.synthesisModel,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: context },
      ],
      response_format: { type: 'json_object' },
    });

    return this.parseJsonResponse<UserMemoryProfile>(
      response.choices[0].message.content,
      (o: any): o is UserMemoryProfile => {
        if (typeof o !== 'object') return false;

        const obj = o as Record<string, any>;
        if (!Array.isArray(obj.commonMistakes)) return false;

        const commonMistakes = obj.commonMistakes as Record<string, any>[];
        if (
          !commonMistakes.every((mistake) => {
            return (
              typeof mistake.area === 'string' &&
              typeof mistake.detail === 'string' &&
              typeof mistake.count === 'number'
            );
          })
        ) {
          return false;
        }

        return Array.isArray(obj.learningGoals) && Array.isArray(obj.interests);
      },
    );
  }

  /**
   * Assesses a user's language proficiency based on a text they have written.
   * @param userWrittenText The text provided by the user for analysis.
   * @returns A structured assessment of their proficiency.
   */
  async assessUserProficiency(
    userWrittenText: string,
  ): Promise<UserProficiencyAssessmentDto> {
    if (!userWrittenText || userWrittenText.trim().length < 20) {
      throw new BadRequestException('Text for analysis is too short.');
    }

    this.logger.log('Assessing user proficiency...');

    const responseData = await this.makeOpenRouterRequest<{
      choices: { message: { content: string } }[];
    }>({
      model: this.analysisModel,
      messages: [
        { role: 'system', content: AI_PROMPTS.userLevelAnalysis },
        { role: 'user', content: userWrittenText },
      ],
      response_format: { type: 'json_object' },
    });

    const assessment = this.parseJsonResponse<UserProficiencyAssessmentDto>(
      responseData.choices[0].message.content,
      (o): o is UserProficiencyAssessmentDto => {
        if (typeof o !== 'object') return false;

        const obj = o as Record<string, any>;
        return (
          typeof obj.estimatedCefrLevel === 'string' &&
          Array.isArray(obj.strengths) &&
          Array.isArray(obj.areasForImprovement)
        );
      },
    );

    this.logger.log(
      `User proficiency assessed at: ${assessment.estimatedCefrLevel}`,
    );

    return assessment;
  }

  async verifyOpenEndedAnswer(
    question: string,
    suggestedAnswer: string,
    userAnswer: string,
  ): Promise<OpenEndedAnswerVerificationDto> {
    const userInput = JSON.stringify({ question, suggestedAnswer, userAnswer });
    const responseData = await this.makeOpenRouterRequest<{
      choices: { message: { content: string } }[];
    }>({
      model: this.analysisModel,
      messages: [
        { role: 'system', content: AI_PROMPTS.openEndedGrader },
        { role: 'user', content: userInput },
      ],
      response_format: { type: 'json_object' },
    });

    return this.parseJsonResponse<OpenEndedAnswerVerificationDto>(
      responseData.choices[0].message.content,
      (o): o is OpenEndedAnswerVerificationDto => {
        if (typeof o !== 'object') return false;

        const obj = o as Record<string, any>;
        return (
          typeof obj.isCorrect === 'boolean' && typeof obj.feedback === 'string'
        );
      },
    );
  }
}
