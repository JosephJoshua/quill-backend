import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserToContent } from './user-to-content.entity';

export interface DifficultyAnalysis {
  numericScore: number;
  justification: string;
  keyChallenges: string[];
}

export interface LinguisticAnalysis {
  keyVocabulary: {
    word: string;
    partOfSpeech: string;
    definition: string;
    exampleSentence: string;
  }[];
  keyGrammar: {
    structureName: string;
    explanation: string;
    exampleSentence: string;
  }[];
  idiomaticExpressions: {
    expression: string;
    meaning: string;
    exampleSentence: string;
  }[];
}

export interface BaseQuestion {
  id: string;

  /**
   * The text content of the question itself.
   */
  question: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  questionType: 'multipleChoice';
  options: string[];
  /**
   * The 0-based index of the correct answer within the `options` array.
   */
  correctAnswerIndex: number;
  /**
   * An optional explanation for why the correct answer is right, which can be shown to the user after they answer.
   */
  explanation?: string;
}

export interface OpenEndedQuestion extends BaseQuestion {
  questionType: 'openEnded';
  subType: 'literal' | 'inference' | 'analytical';
  suggestedAnswer: string;
}

export type ComprehensionQuestion = MultipleChoiceQuestion | OpenEndedQuestion;

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ContentLanguage {
  ENGLISH = 'eng',
  JAPANESE = 'jpn',
  CHINESE_SIMPLIFIED = 'chi_sim',
}

export enum CEFRLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
}

@Entity('content')
export class Content {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  author?: string;

  @Column({ nullable: true })
  genre?: string;

  @Column({
    type: 'enum',
    enum: ContentLanguage,
  })
  language: ContentLanguage;

  @Column('text')
  rawText: string;

  @Column()
  blobUrl: string;

  @Column()
  blobName: string;

  @Column()
  fileType: string;

  /**
   * The primary, user-facing difficulty classification (e.g., 'B2').
   */
  @Column({ nullable: true, type: 'enum', enum: CEFRLevel })
  difficultyLevel?: string;

  /**
   * A granular, internal score (1-100) for more precise sorting and matching.
   */
  @Column({ type: 'int', nullable: true })
  difficultyScore?: number;

  /**
   * Stores the full JSON response from the Difficulty Assessment agent.
   */
  @Column('jsonb', { nullable: true })
  difficultyAnalysis?: DifficultyAnalysis;

  /**
   * Stores the full JSON response from the Key Grammar & Vocabulary Analysis AI.
   */
  @Column('jsonb', { nullable: true })
  linguisticAnalysis?: LinguisticAnalysis;

  /**
   * Stores an array of generated comprehension questions.
   */
  @Column('jsonb', { nullable: true })
  comprehensionQuestions?: ComprehensionQuestion[];

  @Column({
    type: 'enum',
    enum: ProcessingStatus,
    default: ProcessingStatus.PENDING,
  })
  processingStatus: ProcessingStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => UserToContent, (userToContent) => userToContent.content)
  userToContents: UserToContent[];
}
