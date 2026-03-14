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
  log.info('[Server]', 'Database initialized. Server ready.');

  const { vehicleManager } = await import('./features/vehicles/vehicle-manager.server');
  setInterval(() => void vehicleManager.saveAll(), 5 * 60 * 1000);
});

mp.events.add('playerQuit', (player: PlayerMp) => {
  const vehMp = player.vehicle;
  if (!vehMp) return;
  const { vehicleManager } = require('./features/vehicles/vehicle-manager.server') as typeof import('./features/vehicles/vehicle-manager.server');
  const runtime = vehicleManager.getRuntimeByMp(vehMp);
  if (!runtime) return;
  runtime.syncPosition();
  void import('./features/vehicles/player-vehicle.service').then((pvSvc) => pvSvc.save(runtime.dbRow));
});

// ── Features ───────────────────────────────────────────────────────────────
import './features';
