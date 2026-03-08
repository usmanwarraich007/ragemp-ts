import 'reflect-metadata';
import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../database/BaseEntity';
import type { BusinessType } from '@ragemp/shared';

@Entity('businesses')
export class Business extends BaseEntity {
  @Column({ type: 'varchar', length: 32 })
  type!: BusinessType;

  @Column({ type: 'varchar', length: 64 })
  name!: string;

  /** null = unowned (government / admin-managed) */
  @Column({ type: 'int', nullable: true, default: null })
  ownerId!: number | null;

  @Column({ type: 'boolean', default: false })
  isOpen!: boolean;

  /** Business bank — revenue accumulates here, owner withdraws manually */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance!: number;

  // ── Anchor position (fallback / reference point) ──────────────────────────
  @Column({ type: 'float', default: 0 }) x!: number;
  @Column({ type: 'float', default: 0 }) y!: number;
  @Column({ type: 'float', default: 0 }) z!: number;

  @OneToMany(() => BusinessInventory, (inv) => inv.business, { cascade: true, eager: false })
  inventory!: BusinessInventory[];

  @OneToMany(() => BusinessZone, (z) => z.business, { cascade: true, eager: false })
  zones!: BusinessZone[];
}

/**
 * BusinessZone — stores the absolute world position of each named zone
 * for a business (e.g. 'customer', 'owner', 'showcase').
 *
 * Zones default to the business anchor + type-specific offsets on create.
 * Admin uses /business setzone [id] [zoneKey] to fine-tune individually.
 */
@Entity('business_zones')
export class BusinessZone extends BaseEntity {
  @ManyToOne(() => Business, (b) => b.zones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business!: Business;

  @Column({ type: 'int' })
  businessId!: number;

  /** e.g. 'customer' | 'owner' | 'showcase' */
  @Column({ type: 'varchar', length: 32 })
  zoneKey!: string;

  @Column({ type: 'float', default: 0 }) x!: number;
  @Column({ type: 'float', default: 0 }) y!: number;
  @Column({ type: 'float', default: 0 }) z!: number;
  /** Direction the showcase / spawn faces (0–360, GTA compass). */
  @Column({ type: 'float', default: 0 }) heading!: number;
}

@Entity('business_inventory')
export class BusinessInventory extends BaseEntity {
  @ManyToOne(() => Business, (b) => b.inventory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business!: Business;

  @Column({ type: 'int' })
  businessId!: number;

  /** Vehicle model name (dealership) or item id string (store) */
  @Column({ type: 'varchar', length: 64 })
  itemKey!: string;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  /** What the owner paid per unit when restocking */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  purchasePrice!: number;

  /** Price charged to customers */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  sellPrice!: number;
}
