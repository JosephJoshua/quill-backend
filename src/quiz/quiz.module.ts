import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content } from '../content/entity/content.entity';
import { QuizAttempt } from './entity/quiz-attempt.entity';
import { Answer } from './entity/answer.entity';
import { QueueModule } from '../queue/queue.module';
import { QuizVerificationProcessor } from './quiz-verification.processor';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Content, QuizAttempt, Answer]),
    QueueModule,
    AiModule,
  ],
  controllers: [QuizController],
  providers: [QuizService, QuizVerificationProcessor],
})
export class QuizModule {}
