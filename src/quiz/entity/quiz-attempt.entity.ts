import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Answer } from './answer.entity';

export enum QuizStatus {
  GRADING = 'grading', // Open-ended questions are being verified
  COMPLETED = 'completed', // All questions have been graded
}

@Entity('quiz_attempts')
export class QuizAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Index()
  @Column('uuid')
  contentId: string;

  @Column({ type: 'enum', enum: QuizStatus, default: QuizStatus.GRADING })
  status: QuizStatus;

  @Column('float', { nullable: true })
  score?: number; // Final score (e.g., 85.7)

  @CreateDateColumn()
  createdAt: Date;

  @Column('timestamp with time zone', { nullable: true })
  completedAt?: Date;

  @OneToMany(() => Answer, (answer) => answer.quizAttempt)
  answers: Answer[];
}
