import { Module } from '@nestjs/common';
import { TutorService } from './tutor.service';
import { TutorController } from './tutor.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './dto/conversation.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation]), AiModule],
  providers: [TutorService],
  controllers: [TutorController],
})
export class TutorModule {}
