import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { CEFRLevel, ContentLanguage } from '../entity/content.entity';
import { Type } from 'class-transformer';

const validSortBy = ['newest', 'difficulty_asc', 'difficulty_desc'] as const;
export type SortBy = (typeof validSortBy)[number];

export class ContentListQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsEnum(ContentLanguage)
  language?: ContentLanguage;

  @IsOptional()
  @IsEnum(CEFRLevel)
  difficultyLevel?: CEFRLevel;

  @IsOptional()
  @IsIn(validSortBy)
  sortBy: SortBy = 'newest';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
