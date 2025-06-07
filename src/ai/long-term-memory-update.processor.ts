import { Processor, WorkerHost } from '@nestjs/bullmq';
import { LONG_TERM_MEMORY_UPDATE_QUEUE } from '../queue/queue.module';
import { Job } from 'bullmq';
import { AiService } from './ai.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Conversation } from './conversation.entity';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { User } from 'src/user/user.entity';

export interface LongTermMemoryUpdateJobData {
  userId: string;
}

const CONVERSATION_SUMMARY_COUNT = 10; // Max number of recent conversations to summarize

@Processor(LONG_TERM_MEMORY_UPDATE_QUEUE, {
  concurrency: 2,
})
export class LongTermMemoryUpdateProcessor extends WorkerHost {
  private readonly logger = new Logger(LongTermMemoryUpdateProcessor.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super();
  }

  async process(job: Job<LongTermMemoryUpdateJobData>): Promise<void> {
    const { userId } = job.data;
    this.logger.log(`Updating long-term memory for user ${userId}...`);

    const userProfile = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!userProfile || !userProfile.targetLanguage) {
      this.logger.warn(
        `User ${userId} has no profile or target language set. Skipping.`,
      );
      return;
    }

    const recentConversations = await this.conversationRepository.find({
      where: { userId },
      relations: ['dialogues'],
      order: { updatedAt: 'DESC' },
      take: CONVERSATION_SUMMARY_COUNT,
    });

    if (recentConversations.length === 0) return;

    const transcripts = recentConversations
      .map(
        (c) =>
          `--- Conversation: ${c.id} ---\n${c.dialogues.map((d) => `User: ${d.userMessage}\nAI: ${d.aiResponse}`).join('\n')}`,
      )
      .join('\n\n');

    userProfile.longTermMemory = await this.aiService.synthesizeLongTermMemory(
      userProfile.longTermMemory,
      transcripts,
      userProfile.targetLanguage,
      userProfile.nativeLanguages || ['English'],
    );

    userProfile.longTermMemoryLastUpdatedAt = new Date();

    await this.userRepository.save(userProfile);

    this.logger.log(
      `Successfully updated long-term memory for user ${userId}.`,
    );
  }
}
