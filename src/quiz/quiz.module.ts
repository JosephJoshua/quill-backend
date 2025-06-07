import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content } from '../content/entity/content.entity';
import { QuizAttempt } from './entity/quiz-attempt.entity';
import { Answer } from './entity/answer.entity';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Content, QuizAttempt, Answer]),
    QueueModule,
  ],
  controllers: [QuizController],
  providers: [QuizService],
})
export class QuizModule {}
