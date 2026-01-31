import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { MealieUser } from './mealie-user.entity';

export interface Ingredient {
  quantity?: number | string; // Can be number or string for ranges like "3-4"
  unit?: string;
  name: string;
  modifiers?: string[]; // Preparation/state modifiers like "chopped", "diced", "frozen"
  note?: string;
  originalText: string; // The original raw text from the recipe
  rawLine?: string; // The full original line from the recipe source (for reference when fixing)
  knownIngredientId?: string; // Reference to KnownIngredient
  knownUnitId?: string; // Reference to KnownUnit
  parsed?: boolean; // Whether this ingredient was successfully parsed and matched
  section?: string; // Section/category this ingredient belongs to (e.g., "Dough", "Filling")
}

export interface Instruction {
  position: number;
  text: string;
  title?: string;
}

@Entity('recipes')
export class Recipe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ownerId: string;

  @ManyToOne(() => User, (user) => user.recipes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  prepTime: string;

  @Column({ nullable: true })
  cookTime: string;

  @Column({ nullable: true })
  totalTime: string;

  @Column({ type: 'integer', nullable: true })
  servings: number;

  @Column({ nullable: true })
  sourceUrl: string;

  @Column({ type: 'simple-json', default: '[]' })
  ingredients: Ingredient[];

  @Column({ type: 'simple-json', default: '[]' })
  instructions: Instruction[];

  @Column({ type: 'simple-json', default: '[]' })
  tags: string[];

  @Column({ nullable: true })
  category: string;

  @Column({ default: false })
  isShared: boolean;

  @Column({ nullable: true })
  originalMealieUserId: string;

  @ManyToOne(() => MealieUser, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'originalMealieUserId' })
  originalMealieUser: MealieUser;

  @Column({ default: false })
  hasUnparsedIngredients: boolean; // True if any ingredient wasn't matched to known ingredients

  @ManyToMany(() => User)
  @JoinTable({
    name: 'recipe_shared_with',
    joinColumn: { name: 'recipeId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  sharedWith: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

