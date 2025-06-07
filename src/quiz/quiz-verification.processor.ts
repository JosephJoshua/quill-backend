import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content } from '../content/content.entity';
import { AiService } from '../ai/ai.service';
import { QuizService } from './quiz.service';
import { Logger } from '@nestjs/common';
import { QUIZ_VERIFICATION_QUEUE } from '../queue/queue.module';
import { Answer, VerificationStatus } from './entity/answer.entity';
import { pRateLimit } from 'p-ratelimit';

@Processor(QUIZ_VERIFICATION_QUEUE)
export class QuizVerificationProcessor extends WorkerHost {
  private readonly logger = new Logger(QuizVerificationProcessor.name);

  constructor(
    private readonly aiService: AiService,
    private readonly quizService: QuizService,
    @InjectRepository(Content) private contentRepo: Repository<Content>,
    @InjectRepository(Answer) private answerRepo: Repository<Answer>,
  ) {
    super();
  }

  async process(job: Job<{ attemptId: string }>): Promise<void> {
    const { attemptId } = job.data;
    this.logger.log(`Starting verification for quiz attempt ${attemptId}`);

    const answersToVerify = await this.answerRepo.find({
      where: {
        quizAttemptId: attemptId,
        verificationStatus: VerificationStatus.PENDING_VERIFICATION,
      },
      relations: ['quizAttempt'],
    });

    if (answersToVerify.length === 0) {
      this.logger.log(
        `No answers to verify for quiz attempt ${attemptId}. Skipping.`,
      );
      return;
    }

    const content = await this.contentRepo.findOneBy({
      id: answersToVerify[0].quizAttempt.contentId,
    });

    if (content === null) {
      this.logger.error(
        `Content not found for quiz attempt ${attemptId}. Cannot verify answers.`,
      );
      return;
    }

    const questionsMap = new Map(
      content.comprehensionQuestions?.map((q) => [q.id, q]),
    );

    const limit = pRateLimit({ interval: 1000, rate: 10, concurrency: 5 });

    await Promise.all(
      answersToVerify.map((answer) =>
        limit(async () => {
          const question = questionsMap.get(answer.questionId);
          if (!question || question.questionType !== 'openEnded') return;

          try {
            const result = await this.aiService.verifyOpenEndedAnswer(
              question.question,
              question.suggestedAnswer,
              answer.userAnswer,
            );

            answer.isCorrect = result.isCorrect;
            answer.feedback = result.feedback;
            answer.verificationStatus = VerificationStatus.VERIFIED;

            await this.answerRepo.save(answer);
          } catch (error) {
            this.logger.error(`Failed to verify answer ${answer.id}`, error);

            answer.feedback = 'Error during automated grading.';
            answer.isCorrect = false;
            answer.verificationStatus = VerificationStatus.VERIFIED;

            await this.answerRepo.save(answer);
          }
        }),
      ),
    );

    // After all answers are verified, recalculate the final score
    await this.quizService.recalculateScoreAndComplete(attemptId);
    this.logger.log(`Finished verification for quiz attempt ${attemptId}`);
  }
}
