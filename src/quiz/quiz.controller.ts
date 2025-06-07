import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { User } from '../user/entity/user.entity';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { QuizService } from './quiz.service';

@Controller('quizzes')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('submit')
  async submitQuiz(@GetUser() user: User, @Body() submitDto: SubmitQuizDto) {
    return this.quizService.submitQuiz(user.id, submitDto);
  }

  @Get('attempts/:id')
  async getQuizAttempt(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.quizService.getQuizAttempt(user.id, id);
  }
}
