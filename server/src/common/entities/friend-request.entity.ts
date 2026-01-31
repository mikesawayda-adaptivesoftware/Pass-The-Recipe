import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

@Entity('friend_requests')
export class FriendRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fromUserId: string;

  @ManyToOne(() => User, (user) => user.sentFriendRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fromUserId' })
  fromUser: User;

  @Column()
  toUserId: string;

  @ManyToOne(() => User, (user) => user.receivedFriendRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'toUserId' })
  toUser: User;

  @Column({ default: 'pending' })
  status: FriendRequestStatus;

  @CreateDateColumn()
  createdAt: Date;
}

