import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

export const CONVERSATION_SUMMARIZATION_QUEUE = 'conversation-summarization';
export const LONG_TERM_MEMORY_UPDATE_QUEUE = 'long-term-memory-update';
export const CONTENT_INDEXING_QUEUE = 'content-indexing';
export const QUIZ_VERIFICATION_QUEUE = 'quiz-verification';

@Module({
  imports: [
    BullModule.registerQueue({
      name: CONVERSATION_SUMMARIZATION_QUEUE,
    }),
    BullModule.registerQueue({
      name: LONG_TERM_MEMORY_UPDATE_QUEUE,
    }),
    BullModule.registerQueue({
      name: CONTENT_INDEXING_QUEUE,
    }),
    BullModule.registerQueue({
      name: QUIZ_VERIFICATION_QUEUE,
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
