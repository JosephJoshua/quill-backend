import { ContentLanguage } from 'src/content/entity/content.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../user/entity/user.entity';

export interface BaseVocabDetails {
  partOfSpeech?: string;
  audioUrl?: string;
  exampleSentences?: { sentence: string; translation?: string }[];
}

export interface JapaneseVocabDetails extends BaseVocabDetails {
  furigana?: string; // e.g., "かんじ" for "漢字"
  pitchAccent?: number[]; // e.g., [0, 1, 0] for different mora pitches
}

export interface ChineseVocabDetails extends BaseVocabDetails {
  pinyin?: string; // e.g., "hànzì"
  bopomofo?: string; // e.g., "ㄏㄢˋ ㄗˋ"
}

export interface EnglishVocabDetails extends BaseVocabDetails {
  ipa?: string; // International Phonetic Alphabet
}

export type CardDetails =
  | JapaneseVocabDetails
  | ChineseVocabDetails
  | EnglishVocabDetails;

export enum CardState {
  NEW = 0,
  LEARNING = 1,
  REVIEW = 2,
  RELEARNING = 3,
}

export enum Rating {
  AGAIN = 1,
  HARD = 2,
  GOOD = 3,
  EASY = 4,
}

@Entity('flashcard')
export class Flashcard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, (user) => user.flashcards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column('uuid', { nullable: true })
  contentId?: string;

  @Column({ type: 'enum', enum: ContentLanguage })
  language: ContentLanguage;

  // The primary text to be displayed, always present and queryable.
  @Column('text')
  frontText: string;

  @Column('text')
  backText: string;

  // Rich, language-specific metadata.
  @Column('jsonb', { nullable: true })
  details?: CardDetails;

  // --- FSRS Parameters ---
  @Column('float', { default: 0 })
  stability: number;

  @Column('float', { default: 0 })
  difficulty: number;

  @Column()
  learningSteps: number; // Keeps track of the current step during the (re)learning stages

  @Column()
  reps: number;

  @Column({ type: 'enum', enum: CardState, default: CardState.NEW })
  state: CardState;

  @Index()
  @Column('timestamp with time zone')
  dueDate: Date;

  @Column('timestamp with time zone', { nullable: true })
  lastReviewedAt?: Date;

  @Column({ default: 0 })
  lapses: number; // Number of times the user forgot the card
}
