import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserToContent } from '../../content/entity/user-to-content.entity';
import { Conversation } from '../../tutor/entity/conversation.entity';
import { Flashcard } from '../../srs/entity/flashcard.entity';
import { CEFRLevel } from '../../content/entity/content.entity';

export enum Role {
  USER = 'user',
  ADMIN = 'admin',
}

export interface UserMemoryProfile {
  learningGoals: string[];
  commonMistakes: { area: string; detail: string; count: number }[];
  interests: string[];
}

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column()
  name: string;

  @Column({ array: true, type: 'enum', enum: Role, default: [Role.USER] })
  roles: Role[];

  @Column({ nullable: true, type: 'enum', enum: CEFRLevel })
  estimatedCefrLevel?: CEFRLevel;

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

  @OneToMany(() => Flashcard, (flashcard) => flashcard.user)
  flashcards: Flashcard[];
}
