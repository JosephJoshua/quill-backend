import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { ContentLanguage } from '../../content/entity/content.entity';

export enum PromptType {
  DESCRIPTIVE = 'descriptive', // e.g., "Describe your favorite room in your house."
  NARRATIVE = 'narrative', // e.g., "Tell a story about a memorable trip."
  ARGUMENTATIVE = 'argumentative', // e.g., "Do you think social media is good or bad? Explain why."
}

@Entity('assessment_prompt')
export class AssessmentPrompt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'enum', enum: ContentLanguage })
  language: ContentLanguage;

  @Column({ type: 'enum', enum: PromptType })
  promptType: PromptType;

  @Column('text')
  promptText: string;

  @Column({ default: true })
  isActive: boolean;
}
