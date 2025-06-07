import { CEFRLevel } from '../../content/entity/content.entity';

export interface AreaForImprovement {
  area: 'Grammar' | 'Vocabulary' | 'Structure' | 'Clarity';
  specifics: string;
}

export interface UserProficiencyAssessment {
  estimatedCefrLevel: CEFRLevel;
  strengths: string[];
  areasForImprovement: AreaForImprovement[];
}
