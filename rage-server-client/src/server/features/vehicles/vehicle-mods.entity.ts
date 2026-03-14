import 'reflect-metadata';
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../database/BaseEntity';

@Entity('vehicle_mods')
export class VehicleMod extends BaseEntity {
  @Column({ type: 'int' })
  vehicleId!: number;

  @Column({ type: 'smallint' })
  modType!: number;

  @Column({ type: 'smallint' })
  modIndex!: number;
}
