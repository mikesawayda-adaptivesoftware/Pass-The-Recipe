import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type UnitType = 'volume' | 'weight' | 'count' | 'length' | 'other';

@Entity('known_units')
export class KnownUnit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  abbreviation: string | null;

  @Column({ type: 'simple-array', nullable: true })
  aliases: string[];

  @Column({ type: 'varchar', default: 'other' })
  type: UnitType;

  @Column({ type: 'varchar', nullable: true })
  baseUnit: string; // e.g., 'ml' for volume, 'g' for weight

  @Column({ type: 'float', nullable: true })
  conversionToBase: number; // e.g., 1 cup = 236.588 ml

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

