import 'reflect-metadata';
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../database/BaseEntity';

/**
 * PlayerVehicle — one owned vehicle instance per character.
 *
 * Created when a player buys from a dealership.
 * Retrieved when the player goes to a garage/parking lot.
 *
 * Live state (fuel, lock) is also kept as entity.setVariable on the
 * active VehicleMp so clients can read it without RPCs. The DB is the
 * source of truth — written back on despawn / park.
 */
@Entity('player_vehicles')
export class PlayerVehicle extends BaseEntity {
  /** Owning character's DB id. */
  @Column({ type: 'int' })
  characterId!: number;

  /** GTA model name — matches VehicleModelConfig.model. */
  @Column({ type: 'varchar', length: 32 })
  model!: string;

  /** Number plate text (max 8 chars). */
  @Column({ type: 'varchar', length: 8 })
  plate!: string;

  // ── Visuals ────────────────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 7,  default: '#ffffff' }) colorPrimary!:   string;
  @Column({ type: 'varchar', length: 7,  default: '#ffffff' }) colorSecondary!: string;
  @Column({ type: 'int',     default: 0 })                    colorPearl!:     number;
  @Column({ type: 'int',     default: 0 })                    wheelType!:      number;
  @Column({ type: 'int',     default: 0 })                    windowTint!:     number;
  @Column({ type: 'boolean', default: false })                 neonEnabled!:    boolean;
  @Column({ type: 'varchar', length: 7,  default: '#ff00ff' }) neonColor!:     string;

  /**
   * Applied modifications stored as a JSON object: { modType: modIndex }.
   * e.g. { "0": 3, "11": 2 } means engine mod 3 and turbo mod 2.
   * Parsed on spawn, looped with vehicle.setMod(type, index).
   */
  @Column({ type: 'text', default: '{}' })
  mods!: string;

  // ── Health / condition ─────────────────────────────────────────────────────
  @Column({ type: 'float', default: 1000 }) engineHealth!: number;
  @Column({ type: 'float', default: 1000 }) bodyHealth!:   number;
  @Column({ type: 'float', default: 60   }) fuel!:         number;
  @Column({ type: 'float', default: 0    }) dirt!:         number;
  @Column({ type: 'float', default: 0    }) odometer!:     number;

  // ── Logic ──────────────────────────────────────────────────────────────────
  @Column({ type: 'boolean', default: true  }) isLocked!:    boolean;
  @Column({ type: 'boolean', default: true  }) isParked!:    boolean;
  @Column({ type: 'boolean', default: false }) impounded!:   boolean;

  /**
   * If set, the vehicle is currently stored inside this garage.
   * null = out in the world (spawned or parked at a saved position).
   */
  @Column({ type: 'int', nullable: true, default: null })
  garageId!: number | null;

  // ── Parked position (only meaningful when isParked = true) ─────────────────
  @Column({ type: 'float', default: 0 }) parkedX!:         number;
  @Column({ type: 'float', default: 0 }) parkedY!:         number;
  @Column({ type: 'float', default: 0 }) parkedZ!:         number;
  @Column({ type: 'float', default: 0 }) parkedHeading!:   number;
  @Column({ type: 'int',   default: 0 }) parkedDimension!: number;
}
