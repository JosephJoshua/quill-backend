import { Processor, WorkerHost } from '@nestjs/bullmq';
import { CONVERSATION_SUMMARIZATION_QUEUE } from '../queue/queue.module';
import { Job } from 'bullmq';
import { AiService } from './ai.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Conversation } from '../tutor/dto/conversation.entity';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';

export interface ConversationSummarizationJobData {
  conversationId: string;
}

@Processor(CONVERSATION_SUMMARIZATION_QUEUE, {
  concurrency: 2,
})
export class ConversationSummarizationProcessor extends WorkerHost {
  private readonly logger = new Logger(ConversationSummarizationProcessor.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
  ) {
    super();
  }

  async process(job: Job<ConversationSummarizationJobData>): Promise<void> {
    const { conversationId } = job.data;

    this.logger.log(
      `Starting summarization for conversation ${conversationId}...`,
    );

    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['dialogues'],
    });

    if (!conversation || conversation.dialogues.length === 0) return;

    const transcript = conversation.dialogues
      .map((d) => `User: ${d.userMessage}\nAI: ${d.aiResponse}`)
      .join('\n\n');

    const { title, summary } =
      await this.aiService.getConversationSummary(transcript);

    await this.conversationRepository.update(conversationId, {
      title,
      summary,
    });

    this.logger.log(`Successfully summarized conversation ${conversationId}.`);
  }
}
