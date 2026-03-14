/**
 * garage.feature.ts — Garage RPCs (getVehicles, retrieve, park) and join sync.
 */

import { Rpc, notify, log, playerStore } from '../../core';
import * as svc from './garage.service';
import * as pvSvc from '../vehicles/player-vehicle.service';
import { vehicleManager } from '../vehicles/vehicle-manager.server';
import type { GarageVehicleDto } from '@ragemp/shared';

// ── Broadcast helpers ─────────────────────────────────────────────────────────

export function broadcastAdd(garage: Parameters<typeof svc.toDto>[0]): void {
  const dto = JSON.stringify(svc.toDto(garage));
  mp.players.forEach((p) => p.call('garage:add', [dto]));
}

export function broadcastUpdate(garage: Parameters<typeof svc.toDto>[0], zones?: Parameters<typeof svc.toDto>[1]): void {
  const dto = JSON.stringify(svc.toDto(garage, zones));
  mp.players.forEach((p) => p.call('garage:update', [dto]));
}

export function broadcastRemove(garageId: number): void {
  mp.players.forEach((p) => p.call('garage:remove', [garageId]));
}

// ── Session helper ────────────────────────────────────────────────────────────

function getCharId(player: PlayerMp): number | null {
  return playerStore.get(player).character?.id ?? null;
}

// ── RPC handlers ──────────────────────────────────────────────────────────────

class GarageFeature {
  /**
   * Returns all vehicles currently stored in a specific garage for the player.
   * Only vehicles with garageId = garageId AND characterId = character.id are returned.
   */
  @Rpc('garage:getVehicles')
  static async getVehicles(
    player: PlayerMp,
    garageId: number,
  ): Promise<GarageVehicleDto[]> {
    const charId = getCharId(player);
    if (!charId) return [];

    const garage = await svc.findById(garageId);
    if (!garage) return [];

    const vehicles = await svc.getParkedVehicles(garageId, charId);
    return vehicles.map((v) => ({
      playerVehicleId: v.id,
      label:           v.model,   // label resolved via vehicle catalog if available
      plate:           v.plate,
      engineHealth:    v.engineHealth,
      fuel:            v.fuel,
    }));
  }

  /**
   * Retrieve a stored vehicle from a garage.
   * Spawns the vehicle at the garage's 'spawn' zone and puts the player inside.
   */
  @Rpc('garage:retrieve')
  static async retrieve(
    player: PlayerMp,
    garageId: number,
    playerVehicleId: number,
  ): Promise<{ ok: boolean; message?: string }> {
    const charId = getCharId(player);
    if (!charId) return { ok: false, message: 'Not logged in.' };

    const vehicle = await pvSvc.findById(playerVehicleId);
    if (!vehicle || vehicle.characterId !== charId) {
      return { ok: false, message: 'Vehicle not found.' };
    }
    if (vehicle.garageId !== garageId) {
      return { ok: false, message: 'Vehicle is not stored in this garage.' };
    }

    // Get the spawn zone for this garage
    const zones    = await svc.getZones(garageId);
    const spawnZone = zones.find((z) => z.zoneKey === 'spawn');
    if (!spawnZone) {
      notify(player).screen.error('Spawn zone not configured for this garage.');
      return { ok: false, message: 'Garage spawn zone not set.' };
    }

    await svc.retrieveVehicle(vehicle);

    // Pass the zone position + heading directly into mp.vehicles.new via overrides.
    // This uses the identical code path to auto-spawn on login (which works correctly)
    // and bypasses the TypeORM RETURNING issue where save() resets parkedHeading.
    const veh = await vehicleManager.spawn(vehicle.id, {
      x:       spawnZone.x,
      y:       spawnZone.y,
      z:       spawnZone.z,
      heading: spawnZone.heading ?? 0,
    });

    if (!veh) return { ok: false, message: 'Failed to spawn vehicle.' };

    log.info('[Garage]', `Retrieve: veh #${vehicle.id} heading=${spawnZone.heading}`);

    // Re-apply visuals after spawn.
    // entityStreamIn fires BEFORE shared variables are set on a fresh spawn
    // (race condition when the player is right next to the spawn point).
    // This event tells the client to re-read and re-apply all visual vars now.
    player.call('vehicle:applyVisuals', [veh.mp.id]);

    log.info('[Garage]', `Player ${player.name} retrieved vehicle #${playerVehicleId} from garage #${garageId}`);
    return { ok: true };
  }

  /**
   * Park the player's current vehicle in a garage.
   * Deducts the park fee from the player's cash/bank.
   */
  @Rpc('garage:park')
  static async park(
    player: PlayerMp,
    garageId: number,
  ): Promise<{ ok: boolean; fee: number; message?: string }> {
    const charId = getCharId(player);
    if (!charId) return { ok: false, fee: 0, message: 'Not logged in.' };

    const vehMp = player.vehicle;
    if (!vehMp) return { ok: false, fee: 0, message: 'You must be in a vehicle.' };

    const garage = await svc.findById(garageId);
    if (!garage) return { ok: false, fee: 0, message: 'Garage not found.' };

    const dbVehicle = vehicleManager.getRuntimeByMp(vehMp)?.dbRow ?? null;
    if (!dbVehicle) {
      return { ok: false, fee: 0, message: 'This vehicle cannot be parked here.' };
    }
    if (dbVehicle.characterId !== charId) {
      return { ok: false, fee: 0, message: 'You do not own this vehicle.' };
    }

    const fee = Number(garage.parkFee);
    const session = playerStore.get(player);

    // TODO: deduct from economy service when available.
    // For now we notify and proceed — swap for an economy check later.
    // if (session.character!.cash < fee) return { ok: false, fee, message: 'Not enough cash.' };

    // Save live state, set GARAGED + garageId, and despawn entity in one operation
    await vehicleManager.storeToGarage(dbVehicle.id, garageId);

    log.info('[Garage]', `Player ${player.name} parked vehicle #${dbVehicle.id} in garage #${garageId} (fee: $${fee})`);
    return { ok: true, fee };
  }
}

// ── Player world sync ─────────────────────────────────────────────────────────

export async function syncPlayerWorld(player: PlayerMp): Promise<void> {
  const all  = await svc.getAllGarages();
  const dtos = JSON.stringify(all.map(({ garage, zones }) => svc.toDto(garage, zones)));
  player.call('garage:sync', [dtos]);
  log.info('[Garage]', `Synced ${all.length} garages to ${player.name}`);
}

void GarageFeature;
