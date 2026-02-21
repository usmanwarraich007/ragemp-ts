import { AppDataSource } from './data-source';
import { log } from '../core/logger';

export async function initDatabase(): Promise<void> {
  try {
    await AppDataSource.initialize();
    log.info('[Database]', 'Connected successfully.');
  } catch (err) {
    log.error('[Database]', 'Connection failed — shutting down.', err);
    process.exit(1);
  }
}
