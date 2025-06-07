import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { UserProficiencyAssessment } from '../../ai/interface/user-proficiency-assessment.interface';

@Entity('proficiency_assessment')
export class ProficiencyAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  promptId: string; // The prompt the user responded to

  @Column('text')
  submittedText: string;

  @Column('jsonb')
  assessmentResult: UserProficiencyAssessment;

  @CreateDateColumn()
  createdAt: Date;
}
