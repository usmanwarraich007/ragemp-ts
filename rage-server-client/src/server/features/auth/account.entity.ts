import 'reflect-metadata'; // Must be first — before any entity or TypeORM import
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../database/BaseEntity';

@Entity('accounts')
export class Account extends BaseEntity {
  @Column({ type: 'varchar', unique: true, length: 32 })
  username!: string;

  @Column({ type: 'varchar' })
  passwordHash!: string;

  @Column({ type: 'int', default: 0 })
  adminLevel!: number;
}
