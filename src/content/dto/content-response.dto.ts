import { Expose } from 'class-transformer';
import {
  ComprehensionQuestion,
  DifficultyAnalysis,
  LinguisticAnalysis,
} from '../entity/content.entity';

export class ContentSummaryResponseDto {
  @Expose() id: string;
  @Expose() title: string;
  @Expose() author?: string;
  @Expose() genre?: string;
  @Expose() language: string;
  @Expose() difficultyLevel?: string;
  @Expose() difficultyScore?: number;
  @Expose() createdAt: Date;
}

export class ContentDetailResponseDto extends ContentSummaryResponseDto {
  @Expose() rawText: string;
  @Expose() difficultyAnalysis?: DifficultyAnalysis;
  @Expose() linguisticAnalysis?: LinguisticAnalysis;
  @Expose() comprehensionQuestions?: ComprehensionQuestion[];
}
