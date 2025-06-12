import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ContentLanguage } from '../entity/content.entity';

export class AdminCreateContentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  genre?: string;

  @IsEnum(ContentLanguage)
  language: ContentLanguage;

  @IsString()
  @IsOptional()
  description?: string;
}
