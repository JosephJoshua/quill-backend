import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { QuizAttempt } from './quiz-attempt.entity';

export enum VerificationStatus {
  NOT_APPLICABLE = 'not_applicable', // For MCQs
  PENDING_VERIFICATION = 'pending_verification',
  VERIFIED = 'verified',
}

@Entity('answers')
export class Answer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => QuizAttempt, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'quizAttemptId' })
  quizAttempt: QuizAttempt;

  @Index()
  @Column('uuid')
  quizAttemptId: string;

  @Column('text')
  questionId: string; // Links to the question ID in the Content entity's JSON

  @Column('text')
  userAnswer: string; // User's submitted answer (index for MCQ, text for open-ended)

  @Column({ type: 'boolean', nullable: true })
  isCorrect?: boolean; // Instantly set for MCQs, set by AI for open-ended

  @Column('text', { nullable: true })
  feedback?: string; // AI-generated feedback for open-ended questions

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING_VERIFICATION,
  })
  verificationStatus: VerificationStatus;
}
