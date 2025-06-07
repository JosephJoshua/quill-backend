import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Content } from '../content/content.entity';
import { Dialogue } from './dialogue.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Index()
  @Column('uuid')
  contentId: string;

  @ManyToOne(() => Content, { onDelete: 'SET NULL', nullable: true })
  content: Content;

  @OneToMany(() => Dialogue, (dialogue) => dialogue.conversation)
  dialogues: Dialogue[];

  @Column({ length: 200, nullable: true })
  title?: string;

  @Column('text', { nullable: true })
  summary?: string; // Medium-term memory

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
