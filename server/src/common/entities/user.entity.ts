import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Recipe } from './recipe.entity';
import { FriendRequest } from './friend-request.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  displayName: string;

  @Column({ nullable: true })
  photoURL: string;

  @Column({ default: true })
  shareAllRecipesWithFriends: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Recipe, (recipe) => recipe.owner)
  recipes: Recipe[];

  @ManyToMany(() => User)
  @JoinTable({
    name: 'user_friends',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'friendId', referencedColumnName: 'id' },
  })
  friends: User[];

  @OneToMany(() => FriendRequest, (request) => request.fromUser)
  sentFriendRequests: FriendRequest[];

  @OneToMany(() => FriendRequest, (request) => request.toUser)
  receivedFriendRequests: FriendRequest[];

  @ManyToMany(() => Recipe)
  @JoinTable({
    name: 'user_favorites',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'recipeId', referencedColumnName: 'id' },
  })
  favoriteRecipes: Recipe[];
}

