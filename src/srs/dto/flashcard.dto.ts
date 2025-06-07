import { Expose } from 'class-transformer';
import { CardDetails } from '../entity/flashcard.entity';

export class FlashcardDto {
  @Expose() id: string;
  @Expose() contentId?: string;
  @Expose() language: string; // ContentLanguage
  @Expose() frontText: string;
  @Expose() backText: string;
  @Expose() details?: CardDetails;
  @Expose() stability: number;
  @Expose() difficulty: number;
  @Expose() learningSteps: number;
  @Expose() reps: number;
  @Expose() state: number; // Index of CardState enum
  @Expose() dueDate: Date;
  @Expose() lastReviewedAt?: Date;
  @Expose() lapses: number;
}
