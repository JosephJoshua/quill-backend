import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';
import { AiService } from './ai.service';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { TutorChatRequestDto } from './dto/tutor-chat-request.dto';
import { UserService } from '../user/user.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly userService: UserService,
  ) {}

  @Post('chat')
  async chat(
    @GetUser('id') userId: string,
    @Body(ValidationPipe) chatRequestDto: TutorChatRequestDto,
  ): Promise<{ response: string; dialogueId: string }> {
    const user = await this.userService.findOneById(userId);
    return this.aiService.getTutorResponse(user, chatRequestDto);
  }

  // @Post('generate/flashcards')
  // async generateFlashcards(
  //   @GetUser('id') userId: string,
  //   @Body(ValidationPipe) generateDto: GenerateFlashcardsDto,
  // ) {
  //   const generatedCards = await this.aiService.generateFlashcards(
  //     userId,
  //     generateDto,
  //   );
  //
  //   const savedCards: Flashcard[] = [];
  //   for (const cardData of generatedCards) {
  //     try {
  //       const saved = await this.learningService.createFlashcard(userId, {
  //         frontText: cardData.front,
  //         backText: cardData.back,
  //         tags: cardData.tags,
  //         contentId: generateDto.contentId,
  //       });
  //
  //       savedCards.push(saved);
  //     } catch (error: unknown) {
  //       if (error instanceof Error) {
  //         this.aiService.logger.error(
  //           `Failed to save generated flashcard: ${error.message}`,
  //           error.stack,
  //         );
  //       } else {
  //         this.aiService.logger.error(
  //           'Failed to save generated flashcard: Unknown error',
  //         );
  //       }
  //     }
  //   }
  //
  //   return { savedCards };
  // }

  // @Post('generate/quiz')
  // async generateQuiz(
  //   @GetUser('id') userId: string,
  //   @Body(ValidationPipe) generateDto: GenerateQuizDto,
  // ) {
  //   const generatedQuizData = await this.aiService.generateQuiz(
  //     userId,
  //     generateDto,
  //   );
  //
  //   try {
  //     const savedQuiz = await this.learningService.createQuiz(userId, {
  //       title: generatedQuizData.title,
  //       description: generatedQuizData.description,
  //       contentId: generateDto.contentId,
  //     });
  //
  //     const savedQuestions: QuizQuestion[] = [];
  //     for (const qData of generatedQuizData.questions) {
  //       const savedQ = await this.learningService.addQuestionToQuiz(
  //         userId,
  //         savedQuiz.id,
  //         {
  //           questionText: qData.questionText,
  //           options: qData.options,
  //           correctAnswerIndex: qData.correctAnswerIndex,
  //           explanation: qData.explanation,
  //         },
  //       );
  //
  //       savedQuestions.push(savedQ);
  //     }
  //
  //     return this.learningService.getQuizById(userId, savedQuiz.id);
  //   } catch (error: unknown) {
  //     if (error instanceof Error) {
  //       this.aiService.logger.error(
  //         `Failed to save generated quiz: ${error.message}`,
  //         error.stack,
  //       );
  //     } else {
  //       this.aiService.logger.error(
  //         'Failed to save generated quiz: Unknown error',
  //       );
  //     }
  //
  //     throw new Error('Failed to save the generated quiz.');
  //   }
  // }
}
