/**
 * player-vehicle.service.ts — CRUD for PlayerVehicle instances.
 *
 * Handles creation (on purchase), lookup, and state persistence.
 * Does NOT manage live RAGE:MP vehicle entities — that is VehicleManager's job.
 */

import { AppDataSource } from '../../database/data-source';
import { PlayerVehicle } from './player-vehicle.entity';
import type { PlayerVehicleDto } from '@ragemp/shared';
import type { VehicleModelConfigDto } from '@ragemp/shared';

const repo = () => AppDataSource.getRepository(PlayerVehicle);

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toDto(v: PlayerVehicle, config?: VehicleModelConfigDto): PlayerVehicleDto {
  return {
    id:             v.id,
    model:          v.model,
    plate:          v.plate,
    label:          config?.label ?? v.model,
    colorPrimary:   v.colorPrimary,
    colorSecondary: v.colorSecondary,
    fuel:           v.fuel,
    odometer:       v.odometer,
    engineHealth:   v.engineHealth,
    bodyHealth:     v.bodyHealth,
    isLocked:       v.isLocked,
    isParked:       v.isParked,
    impounded:      v.impounded,
  };
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function findByCharacter(characterId: number): Promise<PlayerVehicle[]> {
  return repo().findBy({ characterId });
}

export async function findById(id: number): Promise<PlayerVehicle | null> {
  return repo().findOneBy({ id });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Creates a new PlayerVehicle row on purchase.
 * Fuel is pre-filled to the model's fuelCapacity.
 * Colors default to white; the buyer's chosen colorHex overrides primary.
 */
export async function createVehicle(
  characterId: number,
  model:       string,
  plate:       string,
  colorHex:    string,
  config:      VehicleModelConfigDto,
): Promise<PlayerVehicle> {
  const vehicle = repo().create({
    characterId,
    model,
    plate,
    colorPrimary:   colorHex,
    colorSecondary: '#ffffff',
    fuel:           config.fuelCapacity,
    mods:           '{}',
    isParked:       true,
    isLocked:       true,
  });
  return repo().save(vehicle);
}

/** Persist current state back to the DB (called on despawn / park). */
export async function save(vehicle: PlayerVehicle): Promise<PlayerVehicle> {
  return repo().save(vehicle);
}

/** Update parked position + mark as parked. */
export async function setParked(
  vehicle:   PlayerVehicle,
  x: number, y: number, z: number,
  heading:   number,
  dimension: number,
): Promise<void> {
  vehicle.isParked       = true;
  vehicle.parkedX        = x;
  vehicle.parkedY        = y;
  vehicle.parkedZ        = z;
  vehicle.parkedHeading  = heading;
  vehicle.parkedDimension = dimension;
  await repo().save(vehicle);
}

/** Apply a single mod and persist updated mods JSON. */
export async function applyMod(
  vehicle:  PlayerVehicle,
  modType:  number,
  modIndex: number,
): Promise<void> {
  const mods = JSON.parse(vehicle.mods ?? '{}') as Record<string, number>;
  mods[String(modType)] = modIndex;
  vehicle.mods = JSON.stringify(mods);
  await repo().save(vehicle);
}

/** Update fuel level only — called periodically while driving. */
export async function setFuel(vehicle: PlayerVehicle, fuel: number): Promise<void> {
  vehicle.fuel = Math.max(0, fuel);
  await repo().save(vehicle);
}
