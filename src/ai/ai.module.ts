import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiService } from './ai.service';
import { QueueModule } from '../queue/queue.module';
import { MemoryScheduler } from './memory.scheduler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../tutor/entity/conversation.entity';
import { Dialogue } from '../tutor/entity/dialogue.entity';
import { User } from '../user/entity/user.entity';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([Conversation, Dialogue, User]),
    QueueModule,
  ],
  providers: [AiService, MemoryScheduler],
  exports: [AiService],
})
export class AiModule {}
