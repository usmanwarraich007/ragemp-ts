import 'reflect-metadata';
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../database/BaseEntity';
import type { VehicleState } from '@ragemp/shared';

@Entity('player_vehicles')
export class PlayerVehicle extends BaseEntity {
  @Column({ type: 'int' })
  characterId!: number;

  @Column({ type: 'varchar', length: 32 })
  model!: string;

  @Column({ type: 'varchar', length: 8 })
  plate!: string;

  // ── Health / condition ─────────────────────────────────────────────────────
  @Column({ type: 'float', default: 1000 }) engineHealth!: number;
  @Column({ type: 'float', default: 1000 }) bodyHealth!:   number;
  @Column({ type: 'float', default: 60   }) fuel!:         number;
  @Column({ type: 'float', default: 0    }) dirt!:         number;
  @Column({ type: 'float', default: 0    }) odometer!:     number;

  // ── Logic ──────────────────────────────────────────────────────────────────
  @Column({ type: 'boolean', default: true })
  isLocked!: boolean;

  @Column({ type: 'varchar', length: 12, default: 'GARAGED' })
  state!: VehicleState;

  @Column({ type: 'int', nullable: true, default: null })
  garageId!: number | null;

  // ── Parked position ────────────────────────────────────────────────────────
  @Column({ type: 'float', default: 0 }) parkedX!:         number;
  @Column({ type: 'float', default: 0 }) parkedY!:         number;
  @Column({ type: 'float', default: 0 }) parkedZ!:         number;
  @Column({ type: 'float', default: 0 }) parkedHeading!:   number;
  @Column({ type: 'int',   default: 0 }) parkedDimension!: number;
}
