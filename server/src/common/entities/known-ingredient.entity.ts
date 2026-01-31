import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { KnownModifier } from './known-modifier.entity';

export type IngredientCategory =
  | 'protein'
  | 'produce'
  | 'dairy'
  | 'pantry'
  | 'spices'
  | 'grains'
  | 'condiments'
  | 'baking'
  | 'frozen'
  | 'beverages'
  | 'other';

@Entity('known_ingredients')
export class KnownIngredient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'varchar', default: 'other' })
  category: IngredientCategory;

  @Column({ type: 'simple-array', nullable: true })
  aliases: string[];

  @Column({ type: 'varchar', nullable: true })
  defaultUnit: string;

  @ManyToMany(() => KnownModifier)
  @JoinTable({
    name: 'ingredient_common_modifiers',
    joinColumn: { name: 'ingredientId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'modifierId', referencedColumnName: 'id' },
  })
  commonModifiers: KnownModifier[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

