import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('mealie_users')
export class MealieUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  mealieId: string; // Original Mealie UUID

  @Column()
  fullName: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  linkedUserId: string | null; // FK to User when matched

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linkedUserId' })
  linkedUser: User;

  @CreateDateColumn()
  importedAt: Date;
}

