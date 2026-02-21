import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_PORT, POSTGRES_USER, POSTGRES_HOST } from './environment';

// ── Entity imports ────────────────────────────────────────────────────────────
// Glob paths don't work with bundled code (esbuild outputs a single index.js).
// Register every entity class explicitly here.
import { Account } from '../features/auth/account.entity';
import { Character } from '../features/auth/character.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: POSTGRES_HOST,
  port: Number(POSTGRES_PORT),
  username: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  database: POSTGRES_DB,
  synchronize: process.env.NODE_ENV !== 'production', // auto-creates tables in dev
  logging: true,
  entities: [Account, Character],
});
