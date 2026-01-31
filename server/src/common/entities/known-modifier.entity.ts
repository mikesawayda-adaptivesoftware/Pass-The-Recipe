import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ModifierType =
  | 'preparation' // chopped, diced, minced, sliced
  | 'state' // fresh, frozen, dried, canned
  | 'quality' // boneless, skinless, organic
  | 'size' // large, medium, small
  | 'cooking' // cooked, raw, roasted
  | 'other';

@Entity('known_modifiers')
export class KnownModifier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'varchar', default: 'other' })
  type: ModifierType;

  @Column({ type: 'simple-array', nullable: true })
  aliases: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

