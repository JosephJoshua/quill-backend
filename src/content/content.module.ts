import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { Content } from './entity/content.entity';
import { IndexingProcessor } from './indexing.processor';
import { AiModule } from '../ai/ai.module';
import { UserToContent } from './entity/user-to-content.entity';
import { QueueModule } from 'src/queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Content, UserToContent]),
    AiModule,
    QueueModule,
  ],
  providers: [ContentService, IndexingProcessor],
  controllers: [ContentController],
  exports: [ContentService],
})
export class ContentModule {}
