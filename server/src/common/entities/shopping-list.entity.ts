import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Recipe } from './recipe.entity';
import { ShoppingListItem } from './shopping-list-item.entity';

@Entity('shopping_lists')
export class ShoppingList {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'boolean', default: false })
  isComplete: boolean;

  @OneToMany(() => ShoppingListItem, (item) => item.shoppingList, {
    cascade: true,
    eager: true,
  })
  items: ShoppingListItem[];

  @ManyToMany(() => Recipe)
  @JoinTable({
    name: 'shopping_list_recipes',
    joinColumn: { name: 'shoppingListId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'recipeId', referencedColumnName: 'id' },
  })
  recipes: Recipe[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

