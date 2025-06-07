import { ContentLanguage } from 'src/content/content.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToMany,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../user/user.entity';

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
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

export enum Rating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

@Entity('flashcards')
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

  @Column({ type: 'enum', enum: CardState, default: CardState.New })
  state: CardState;

  @Index()
  @Column('timestamp with time zone')
  dueDate: Date;

  @Column('timestamp with time zone', { nullable: true })
  lastReviewedAt?: Date;

  @Column({ default: 0 })
  lapses: number; // Number of times the user forgot the card
}
