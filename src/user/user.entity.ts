import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserToContent } from '../content/user-to-content.entity';
import { Conversation } from '../ai/conversation.entity';

export interface UserMemoryProfile {
  learningGoals: string[];
  commonMistakes: { area: string; detail: string; count: number }[];
  interests: string[];
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column()
  name: string;

  @Column({
    type: 'jsonb',
  })
  nativeLanguages: string[];

  @Column()
  targetLanguage: string;

  @Column('jsonb', { nullable: true })
  longTermMemory?: UserMemoryProfile;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
  })
  longTermMemoryLastUpdatedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => UserToContent, (userToContent) => userToContent.user)
  userToContents: UserToContent[];

  @OneToMany(() => Conversation, (conv) => conv.user)
  conversations: Conversation[];
}
