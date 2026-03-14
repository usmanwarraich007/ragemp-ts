import 'reflect-metadata';
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../database/BaseEntity';
import type { VehicleKeyRole } from '@ragemp/shared';

@Entity('vehicle_keys')
export class VehicleKey extends BaseEntity {
  @Column({ type: 'int' })
  vehicleId!: number;

  @Column({ type: 'int' })
  characterId!: number;

  @Column({ type: 'varchar', length: 16, default: 'owner' })
  role!: VehicleKeyRole;
}
