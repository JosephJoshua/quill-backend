import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { Dialogue } from './dialogue.entity';
import { QueueModule } from '../queue/queue.module';
import { Conversation } from './conversation.entity';
import { MemoryScheduler } from './memory.scheduler';
import { User } from '../user/user.entity';

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
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
