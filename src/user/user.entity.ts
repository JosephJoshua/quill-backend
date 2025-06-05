import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Content } from '../content/content.entity';
import { Flashcard } from '../learning/flashcard.entity';
import { Dialogue } from '../ai/dialogue.entity';

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Content, (content) => content.user)
  contents: Content[];

  @OneToMany(() => Flashcard, (flashcard) => flashcard.user)
  flashcards: Flashcard[];

  @OneToMany(() => Dialogue, (dialogue) => dialogue.user)
  dialogues: Dialogue[];
}
