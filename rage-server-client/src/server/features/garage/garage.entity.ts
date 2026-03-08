import 'reflect-metadata';
import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../database/BaseEntity';
import type { GarageType } from '@ragemp/shared';

/**
 * Garage — a named parking facility of a specific type.
 *
 * x/y/z is the anchor position (fallback / reference point).
 * Fine-grained zone positions are stored in GarageZone rows.
 */
@Entity('garages')
export class Garage extends BaseEntity {
  @Column({ type: 'varchar', length: 32 })
  type!: GarageType;

  @Column({ type: 'varchar', length: 64 })
  name!: string;

  /** Fee charged per /park action. */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  parkFee!: number;

  // ── Anchor position ────────────────────────────────────────────────────────
  @Column({ type: 'float', default: 0 }) x!: number;
  @Column({ type: 'float', default: 0 }) y!: number;
  @Column({ type: 'float', default: 0 }) z!: number;

  @OneToMany(() => GarageZone, (z) => z.garage, { cascade: true, eager: false })
  zones!: GarageZone[];
}

/**
 * GarageZone — stores the absolute world position of each named zone
 * for a garage (e.g. 'entrance', 'spawn' for PUBLIC;other types define their own).
 *
 * Admin uses /garage setzone [id] [zoneKey] to position each zone.
 */
@Entity('garage_zones')
export class GarageZone extends BaseEntity {
  @ManyToOne(() => Garage, (g) => g.zones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'garageId' })
  garage!: Garage;

  @Column({ type: 'int' })
  garageId!: number;

  /** e.g. 'entrance' | 'spawn' (PUBLIC) — each type defines its own keys */
  @Column({ type: 'varchar', length: 32 })
  zoneKey!: string;

  @Column({ type: 'float', default: 0 }) x!: number;
  @Column({ type: 'float', default: 0 }) y!: number;
  @Column({ type: 'float', default: 0 }) z!: number;
  /** Direction the vehicle / player will face at this zone (0–360). */
  @Column({ type: 'float', default: 0 }) heading!: number;
}
