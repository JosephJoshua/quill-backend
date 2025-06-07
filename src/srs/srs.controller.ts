import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CreateFlashcardDto } from './dto/create-flashcard.dto';
import { User } from '../user/user.entity';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { SrsService } from './srs.service';
import { UpdateFlashcardDto } from './dto/update-flashcard.dto';

@Controller('flashcards')
export class SrsController {
  constructor(private readonly srsService: SrsService) {}

  @Post()
  create(@GetUser() user: User, @Body() createDto: CreateFlashcardDto) {
    return this.srsService.create(user.id, createDto);
  }

  @Get('review-queue')
  getReviewQueue(@GetUser() user: User) {
    return this.srsService.getReviewQueue(user.id);
  }

  @Post('review')
  submitReview(@GetUser() user: User, @Body() reviewDto: SubmitReviewDto) {
    return this.srsService.submitReview(user.id, reviewDto);
  }

  @Patch(':id')
  update(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateFlashcardDto,
  ) {
    return this.srsService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.srsService.remove(user.id, id);
  }
}
