/**
 * vehicle-trunk.feature.ts — Server-side vehicle state: doors, engine, lock.
 *
 * Door/trunk toggling: 'vehicle:door:toggle' (trunk = doorIndex 5).
 * Engine:              'vehicle:setEngine'   (Arrow Up/Down from client)
 * Lock:                'vehicle:toggleLock'  (K key from client)
 *
 * Engine + lock changes are synced to clients via setVariable — RAGE:MP's
 * addDataHandler on the client fires automatically for all streamed-in players.
 * No manual mp.players.forEach broadcasts needed for engine or lock.
 *
 * Door natives are client-only — server tracks state and broadcasts
 * 'vehicle:door:apply' so all nearby clients run the native.
 */
import { Rpc, notify, log } from '../../core';
import { vehicleManager } from './vehicle-manager.server';

// ── Door state store ─────────────────────────────────────────────────────────

/** `${vehicleId}:${doorIndex}` → isOpen */
const doorStates = new Map<string, boolean>();

class VehicleStateFeature {

  // ── Doors / Hood / Trunk ───────────────────────────────────────────────────

  @Rpc('vehicle:door:toggle')
  static toggleDoor(
    player: PlayerMp,
    vehicleRemoteId: number,
    doorIndex: number,
    currentlyOpen: boolean,   // actual state read client-side via getDoorAngleRatio
  ): { isOpen: boolean } {
    const vehicle = mp.vehicles.toArray().find((v) => v.id === vehicleRemoteId);

    if (!vehicle) {
      notify(player).screen.error('Vehicle not found.');
      log.warn('[VehicleState]', `remoteId ${vehicleRemoteId} not found for ${player.name}`);
      return { isOpen: false };
    }

    // ── Lock check: reject if vehicle is locked ────────────────────────────
    const isLocked = vehicle.getVariable('locked') as boolean | undefined;
    if (isLocked) {
      notify(player).screen.error('The vehicle is locked.');
      return { isOpen: false };
    }

    // Use the client-reported angle-based state as source of truth.
    // This handles doors opened/closed by GTA's own F key (which bypasses our Map).
    const newState = !currentlyOpen;
    const key = `${vehicle.id}:${doorIndex}`;
    doorStates.set(key, newState);

    mp.players.forEach((p) => p.call('vehicle:door:apply', [vehicleRemoteId, doorIndex, newState]));
    log.info('[VehicleState]', `${player.name} ${newState ? 'opened' : 'closed'} door ${doorIndex} on veh#${vehicleRemoteId}`);
    return { isOpen: newState };
  }

  // ── Engine ─────────────────────────────────────────────────────────────────

  @Rpc('vehicle:setEngine')
  static setEngine(
    player: PlayerMp,
    vehicleRemoteId: number,
    on: boolean,
  ): { ok: boolean } {
    const vehicle = mp.vehicles.toArray().find((v) => v.id === vehicleRemoteId);
    if (!vehicle) return { ok: false };

    // Only the driver (or owner) can control the engine
    if (player.vehicle?.id !== vehicleRemoteId) {
      notify(player).screen.error('You must be in the vehicle to control the engine.');
      return { ok: false };
    }

    // setVariable triggers addDataHandler('engineOn') on all clients that
    // currently have this vehicle streamed in — no manual broadcast needed.
    vehicle.setVariable('engineOn', on);

    log.info('[VehicleState]', `${player.name} turned engine ${on ? 'ON' : 'OFF'} on veh#${vehicleRemoteId}`);
    return { ok: true };
  }

  // ── Lock ───────────────────────────────────────────────────────────────────

  @Rpc('vehicle:toggleLock')
  static toggleLock(
    player: PlayerMp,
    vehicleRemoteId: number,
  ): { locked: boolean } {
    const vehicle = mp.vehicles.toArray().find((v) => v.id === vehicleRemoteId);
    if (!vehicle) return { locked: true };

    const currentLocked = vehicle.getVariable('locked') as boolean | undefined;
    const newLocked = !currentLocked;

    // Sync via VehicleManager for managed vehicles (updates DB row + entity.locked)
    const dbId = vehicle.getVariable('dbId') as number | undefined;
    if (dbId && dbId > 0) {
      vehicleManager.setLocked(dbId, newLocked);
    } else {
      // Unmanaged vehicle (e.g. admin-spawned) — just update the variable
      vehicle.setVariable('locked', newLocked);
      vehicle.locked = newLocked;
    }

    // setVariable triggers addDataHandler('locked') on all streamed-in clients.
    log.info('[VehicleState]', `${player.name} ${newLocked ? 'locked' : 'unlocked'} veh#${vehicleRemoteId}`);
    return { locked: newLocked };
  }
}

// ── Clean up door state when vehicle is destroyed ────────────────────────────

mp.events.add('vehicleDestroyed', (vehicle: VehicleMp) => {
  for (const key of doorStates.keys()) {
    if (key.startsWith(`${vehicle.id}:`)) doorStates.delete(key);
  }
});

// ── Save vehicle world position when a player exits ──────────────────────────
// Keeps parkedX/Y/Z up to date on every exit so the DB always reflects the
// vehicle's last known map location. Does NOT mark it as parked — the vehicle
// stays active and will respawn here on server restart / player login.

// ── Save vehicle world position when a player exits ──────────────────────────
// playerExitVehicle fires AFTER the player is fully standing — ideal timing
// because the vehicle's final resting position is already settled by then.

mp.events.add('playerExitVehicle', (player: PlayerMp, vehicle: VehicleMp) => {
  const dbId = vehicle.getVariable('dbId') as number | undefined;
  if (!dbId) return; // unmanaged vehicle — nothing to save

  void vehicleManager.savePosition(vehicle).catch((err) =>
    log.error('[VehicleState]', `Failed to save position for veh db#${dbId}`, err),
  );
});

void VehicleStateFeature;
