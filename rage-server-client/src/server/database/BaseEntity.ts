import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity as TypeOrmBase,
} from 'typeorm';

/**
 * BaseEntity — abstract TypeORM entity all RP entities should extend.
 *
 * Provides:
 *   id         — auto-incrementing primary key
 *   createdAt  — set once on insert
 *   updatedAt  — updated on every save
 *
 * Usage:
 *   @Entity()
 *   export class Account extends BaseEntity { ... }
 */
export abstract class BaseEntity extends TypeOrmBase {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
