import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('dialogues')
export class Dialogue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  conversationId: string;

  @ManyToOne(() => Conversation, (conv) => conv.dialogues, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column('text')
  userMessage: string;

  @Column('text')
  aiResponse: string;

  @Column()
  openRouterModel: string;

  @Column({ type: 'integer', nullable: true })
  promptTokens?: number;

  @Column({ type: 'integer', nullable: true })
  completionTokens?: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  timestamp: Date;
}
