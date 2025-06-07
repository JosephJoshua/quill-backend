import { CEFRLevel } from '../entity/content.entity';

export interface SearchableContent {
  id: string;
  contentId: string;
  title: string;
  author?: string;
  genre?: string;
  language?: string;
  chunkText: string;
  contentVector?: number[];
  difficultyLevel?: CEFRLevel;
}
