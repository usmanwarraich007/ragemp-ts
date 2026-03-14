import 'reflect-metadata';
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../database/BaseEntity';

@Entity('vehicle_cosmetics')
export class VehicleCosmetics extends BaseEntity {
  @Column({ type: 'int', unique: true })
  vehicleId!: number;

  @Column({ type: 'varchar', length: 7, default: '#ffffff' }) colorPrimary!:   string;
  @Column({ type: 'varchar', length: 7, default: '#ffffff' }) colorSecondary!: string;
  @Column({ type: 'int',     default: 0 })                   colorPearl!:     number;
  @Column({ type: 'int',     default: 0 })                   wheelColor!:     number;
  @Column({ type: 'int',     default: 0 })                   wheelType!:      number;
  @Column({ type: 'int',     default: 0 })                   windowTint!:     number;
  @Column({ type: 'int',     default: -1 })                  livery!:         number;
  @Column({ type: 'boolean', default: false })                neonEnabled!:    boolean;
  @Column({ type: 'smallint', default: 255 })                neonColorR!:     number;
  @Column({ type: 'smallint', default: 0 })                  neonColorG!:     number;
  @Column({ type: 'smallint', default: 255 })                neonColorB!:     number;
  @Column({ type: 'int',     default: 0 })                   xenonColor!:     number;
}
