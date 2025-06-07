import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ContentLanguage } from '../../content/content.entity';
import { CardDetails } from '../entity/flashcard.entity';

export class CreateFlashcardDto {
  @IsOptional()
  @IsUUID()
  contentId?: string;

  @IsEnum(ContentLanguage)
  language: ContentLanguage;

  @IsString()
  @IsNotEmpty()
  frontText: string;

  @IsString()
  @IsNotEmpty()
  backText: string;

  @IsOptional()
  details?: CardDetails;
}
