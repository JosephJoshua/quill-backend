import {
  CEFRLevel,
  ComprehensionQuestion,
  DifficultyAnalysis,
  LinguisticAnalysis,
} from '../../content/entity/content.entity';

export interface ContentAnalysisResult {
  difficultyLevel: CEFRLevel;
  difficultyAnalysis: DifficultyAnalysis;
  linguisticAnalysis: LinguisticAnalysis;
  comprehensionQuestions: ComprehensionQuestion[];
}
