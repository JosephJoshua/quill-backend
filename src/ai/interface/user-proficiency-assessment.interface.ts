import { CEFRLevel } from '../../content/content.entity';

export interface AreaForImprovement {
  area: 'Grammar' | 'Vocabulary' | 'Structure' | 'Clarity';
  specifics: string;
}

export interface UserProficiencyAssessment {
  estimatedCefrLevel: CEFRLevel;
  strengths: string[];
  areasForImprovement: AreaForImprovement[];
}
