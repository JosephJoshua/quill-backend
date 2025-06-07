import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Content } from './content.entity';

@Entity('user_to_content')
export class UserToContent {
  @PrimaryGeneratedColumn('uuid')
  userToContentId: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  contentId: string;

  @ManyToOne(() => User, (user) => user.userToContents)
  user: User;

  @ManyToOne(() => Content, (content) => content.userToContents)
  content: Content;

  @CreateDateColumn()
  createdAt: Date;
}
