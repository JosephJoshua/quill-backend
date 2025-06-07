import { IsEnum, IsUUID } from 'class-validator';
import { Rating } from '../entity/flashcard.entity';

export class SubmitReviewDto {
  @IsUUID()
  flashcardId: string;

  @IsEnum(Rating)
  rating: Rating;
}
