import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ShoppingList } from './shopping-list.entity';

@Entity('shopping_list_items')
export class ShoppingListItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  shoppingListId: string;

  @ManyToOne(() => ShoppingList, (list) => list.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shoppingListId' })
  shoppingList: ShoppingList;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'float', nullable: true })
  quantity: number | null;

  @Column({ type: 'varchar', nullable: true })
  unit: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ default: false })
  isChecked: boolean;

  @Column({ type: 'integer', default: 0 })
  position: number;

  @Column({ type: 'varchar', nullable: true })
  knownIngredientId: string | null;
}

