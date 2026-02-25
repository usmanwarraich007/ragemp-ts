import 'reflect-metadata'; // Must be first — before any entity or TypeORM import
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../database/BaseEntity';
import { Account } from './account.entity';
import type { CharacterAppearance } from '@ragemp/shared';

@Entity('characters')
export class Character extends BaseEntity {
  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountId' })
  account!: Account;

  @Column({ type: 'int' })
  accountId!: number;

  @Column({ type: 'varchar', length: 32 })
  firstName!: string;

  @Column({ type: 'varchar', length: 32 })
  lastName!: string;

  @Column({ type: 'varchar', default: 'male' })
  gender!: 'male' | 'female';

  // ── Position ────────────────────────────────────────────────
  @Column({ type: 'float', default: 0 })
  posX!: number;

  @Column({ type: 'float', default: 0 })
  posY!: number;

  @Column({ type: 'float', default: 0 })
  posZ!: number;

  @Column({ type: 'float', default: 0 })
  heading!: number;

  @Column({ type: 'int', default: 0 })
  dimension!: number;

  // ── Economy ─────────────────────────────────────────────────
  @Column({ type: 'int', default: 5000 })
  cash!: number;

  @Column({ type: 'int', default: 0 })
  bank!: number;

  // ── Job ─────────────────────────────────────────────────────
  @Column({ type: 'varchar', nullable: true, default: null })
  job!: string | null;

  // ── Appearance ──────────────────────────────────────────────
  @Column({ type: 'jsonb', nullable: true, default: null })
  appearance!: CharacterAppearance | null;
}
