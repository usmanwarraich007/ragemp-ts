import { log } from './core/logger';
import { initDatabase } from './database';

// ── Global error safety net ────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  log.error('[Server]', 'Unhandled promise rejection', reason);
});
process.on('uncaughtException', (err) => {
  log.error('[Server]', 'Uncaught exception', err);
});

// ── Core systems ───────────────────────────────────────────────────────────
import './core/Rpc';         // registers addProc('rpc:call') + reverse listeners
import './core/playerStore'; // registers playerJoin / playerQuit lifecycle

// ── Database ───────────────────────────────────────────────────────────────
mp.events.add('packagesLoaded', async () => {
  await initDatabase();
});

// ── Commands ───────────────────────────────────────────────────────────────
import './commands';

// ── Features ───────────────────────────────────────────────────────────────
import './features';
