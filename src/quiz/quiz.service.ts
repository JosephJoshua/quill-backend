import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content } from '../content/entity/content.entity';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QuizAttempt, QuizStatus } from './entity/quiz-attempt.entity';
import { Answer, VerificationStatus } from './entity/answer.entity';
import { QUIZ_VERIFICATION_QUEUE } from '../queue/queue.module';

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(
    @InjectRepository(Content) private contentRepository: Repository<Content>,
    @InjectRepository(QuizAttempt)
    private attemptRepository: Repository<QuizAttempt>,
    @InjectRepository(Answer) private answerRepository: Repository<Answer>,
    @InjectQueue(QUIZ_VERIFICATION_QUEUE) private verificationQueue: Queue,
  ) {}

  async submitQuiz(userId: string, submitDto: SubmitQuizDto) {
    const content = await this.contentRepository.findOneBy({
      id: submitDto.contentId,
    });

    if (!content || !content.comprehensionQuestions) {
      throw new NotFoundException('Content or quiz not found.');
    }

    const questionsMap = new Map(
      content.comprehensionQuestions.map((q) => [q.id, q]),
    );

    const attempt = this.attemptRepository.create({
      userId,
      contentId: submitDto.contentId,
    });

    await this.attemptRepository.save(attempt);

    const answersToCreate: Answer[] = [];
    let openEndedCount = 0;

    for (const userAnswer of submitDto.answers) {
      const question = questionsMap.get(userAnswer.questionId);
      if (!question) continue;

      const answer = this.answerRepository.create({
        quizAttemptId: attempt.id,
        questionId: userAnswer.questionId,
        userAnswer: userAnswer.answer,
      });

      if (question.questionType === 'multipleChoice') {
        answer.isCorrect =
          parseInt(userAnswer.answer, 10) === question.correctAnswerIndex;

        answer.verificationStatus = VerificationStatus.NOT_APPLICABLE;
      } else {
        openEndedCount++;
      }

      answersToCreate.push(answer);
    }

    await this.answerRepository.save(answersToCreate);

    if (openEndedCount > 0) {
      this.logger.log('Queueing verification for open-ended answers');
      await this.verificationQueue.add('verify-answers', {
        attemptId: attempt.id,
      });
    } else {
      // If no open-ended questions, the quiz is already fully graded
      await this.recalculateScoreAndComplete(attempt.id);
    }

    return this.getQuizAttempt(userId, attempt.id);
  }

  async getQuizAttempt(userId: string, attemptId: string) {
    return this.attemptRepository.findOne({
      where: { id: attemptId, userId },
      relations: ['answers'],
    });
  }

  async recalculateScoreAndComplete(attemptId: string) {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId },
      relations: ['answers'],
    });

    if (!attempt) return;

    const totalQuestions = attempt.answers.length;
    const correctAnswers = attempt.answers.filter((a) => a.isCorrect).length;

    attempt.score = (correctAnswers / totalQuestions) * 100;
    attempt.status = QuizStatus.COMPLETED;
    attempt.completedAt = new Date();

    await this.attemptRepository.save(attempt);
  }
}
