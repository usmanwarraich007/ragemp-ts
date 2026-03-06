import 'reflect-metadata';
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../database/BaseEntity';

/**
 * VehicleModelConfig — the "template" for every purchasable GTA vehicle.
 *
 * Configured once by admins via /vcat commands.
 * Read by dealerships, tuning shops, garages — never modified by players.
 *
 * colorsRaw / tagsRaw are stored as comma-separated strings because esbuild
 * strips array type metadata; we parse them in the service layer.
 */
@Entity('vehicle_model_configs')
export class VehicleModelConfig extends BaseEntity {
  /** GTA model name used with mp.joaat(). Must be unique. */
  @Column({ type: 'varchar', length: 32, unique: true })
  model!: string;

  /** Human-readable display name shown in UIs. */
  @Column({ type: 'varchar', length: 64 })
  label!: string;

  /** Category string for filtering (e.g. "Sports", "Muscle", "Sedan"). */
  @Column({ type: 'varchar', length: 32 })
  category!: string;

  @Column({ type: 'int', default: 2 })
  seats!: number;

  /** Base suggested retail price. Dealerships set their own sell price. */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  basePrice!: number;

  /** Tank capacity in litres. */
  @Column({ type: 'float', default: 60 })
  fuelCapacity!: number;

  /** Litres consumed per minute at full throttle. */
  @Column({ type: 'float', default: 0.8 })
  fuelConsume!: number;

  /** Trunk volume in litres for the inventory system. */
  @Column({ type: 'int', default: 100 })
  trunkVolume!: number;

  // ── Stat bars (0-100) — displayed in dealership browse UI ─────────────────
  @Column({ type: 'int', default: 50 }) speed!:    number;
  @Column({ type: 'int', default: 50 }) accel!:    number;
  @Column({ type: 'int', default: 50 }) traction!: number;
  @Column({ type: 'int', default: 50 }) brakes!:   number;

  /**
   * Comma-separated hex color strings for the color picker.
   * e.g. "#ffffff,#333333,#000000,#3498db"
   */
  @Column({ type: 'varchar', length: 256, default: '#ffffff,#333333,#000000' })
  colorsRaw!: string;

  /**
   * Comma-separated tag strings for future filtering/search.
   * e.g. "sports,tunable,electric"
   */
  @Column({ type: 'varchar', length: 128, default: '' })
  tagsRaw!: string;
}
