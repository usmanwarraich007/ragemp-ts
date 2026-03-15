/**
 * fuel.service.ts — Tick-based fuel drain and empty-tank enforcement.
 *
 * Every TICK_INTERVAL_MS the server measures how far each occupied vehicle
 * has moved since the last tick. This is far more accurate than the old
 * entry→exit straight-line delta, and allows enforcement mid-drive.
 *
 * When fuel reaches 0 the engine is killed and the driver is notified.
 */

import { log, notify } from '../../core';
import { vehicleManager } from './vehicle-manager.server';
import * as configSvc from './vehicle-model-config.service';

/** How often (ms) fuel is recalculated. 5 s is accurate enough at any road speed. */
const TICK_INTERVAL_MS = 5_000;

// ── Fuel tick ─────────────────────────────────────────────────────────────────

export function startFuelTick(): void {
  setInterval(() => void fuelTick(), TICK_INTERVAL_MS);
  log.info('[Fuel]', `Fuel tick started (interval: ${TICK_INTERVAL_MS / 1000}s)`);
}

async function fuelTick(): Promise<void> {
  // Snapshot all runtimes — avoid mutating the map while iterating
  const runtimes = vehicleManager.getAllRuntimes();

  for (const runtime of runtimes) {
    // Skip engines that are off — no fuel consumed while parked
    const engineOn = runtime.mp.getVariable('engineOn') as boolean | undefined;
    if (!engineOn) {
      runtime.lastTickPos = null;
      continue;
    }

    const pos = runtime.mp.position;

    // First tick after engine start — seed the position, don't drain yet
    if (!runtime.lastTickPos) {
      runtime.lastTickPos = { x: pos.x, y: pos.y, z: pos.z };
      continue;
    }

    // Distance driven since last tick (metres → km)
    const dx = pos.x - runtime.lastTickPos.x;
    const dy = pos.y - runtime.lastTickPos.y;
    const dz = pos.z - runtime.lastTickPos.z;
    const km = Math.sqrt(dx * dx + dy * dy + dz * dz) / 1000;
    runtime.lastTickPos = { x: pos.x, y: pos.y, z: pos.z };

    if (km === 0) continue; // vehicle hasn't moved — idle, no drain

    // Fuel consumption and odometer
    const config = await configSvc.findByModel(runtime.model);
    if (!config) continue;

    // Re-check runtime is still alive after the async config query
    if (!vehicleManager.getRuntime(runtime.id)) continue;

    runtime.dbRow.odometer += km;
    const newFuel = runtime.dbRow.fuel - km * config.fuelConsume;
    runtime.setFuel(newFuel);

    // ── Empty tank enforcement ────────────────────────────────────────────────
    if (runtime.dbRow.fuel <= 0) {
      // Find the driver (seat index 0)
      const driver = mp.players.toArray().find(
        (p) => p.vehicle?.id === runtime.mp.id && p.seat === 0,
      ) ?? undefined;

      // Notify driver via the server-side toast system before killing the engine
      if (driver) notify(driver).screen.error('Out of fuel! Find a gas station to refuel.');

      runtime.setEngine(false, driver);
      runtime.lastTickPos = null; // reset so we don't drain again next tick

      log.info('[Fuel]', `Vehicle db#${runtime.id} ran out of fuel.`);
    }
  }
}