import {
  CEFRLevel,
  ComprehensionQuestion,
  DifficultyAnalysis,
  LinguisticAnalysis,
} from '../../content/content.entity';

export class ContentAnalysisResultDto {
  difficultyLevel: CEFRLevel;

  difficultyAnalysis: DifficultyAnalysis;

  linguisticAnalysis: LinguisticAnalysis;

  comprehensionQuestions: ComprehensionQuestion[];
}
