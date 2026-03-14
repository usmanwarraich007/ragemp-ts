/**
 * garage.service.ts — Data access layer for the garage system.
 *
 * Uses Cache<K,V> for garages+zones (shared world data) following
 * the same pattern as business.service.ts.
 */

import { AppDataSource } from '../../database/data-source';
import { Garage, GarageZone } from './garage.entity';
import { PlayerVehicle } from '../vehicles/player-vehicle.entity';
import { Cache } from '../../core/Cache';
import type { GarageDto, GarageType } from '@ragemp/shared';

// ── Repositories ───────────────────────────────────────────────────────────────

const garageRepo  = () => AppDataSource.getRepository(Garage);
const zoneRepo    = () => AppDataSource.getRepository(GarageZone);
const vehicleRepo = () => AppDataSource.getRepository(PlayerVehicle);

// ── Cache ─────────────────────────────────────────────────────────────────────

type GarageRow = { garage: Garage; zones: GarageZone[] };
const garageCache = new Cache<number, GarageRow>();

// ── Mappers ───────────────────────────────────────────────────────────────────

export function toDto(g: Garage, zones?: GarageZone[]): GarageDto {
  const dto: GarageDto = {
    id:      g.id,
    type:    g.type as GarageType,
    name:    g.name,
    parkFee: Number(g.parkFee),
    x: g.x, y: g.y, z: g.z,
  };
  if (zones !== undefined) {
    const map: Record<string, { x: number; y: number; z: number }> = {};
    for (const z of zones) map[z.zoneKey] = { x: z.x, y: z.y, z: z.z };
    dto.zones = map;
  }
  return dto;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getAllGarages(): Promise<GarageRow[]> {
  return garageCache.getAll(async () => {
    const garages = await garageRepo().find();
    const zones   = await zoneRepo().find();
    const byGarage = new Map<number, GarageZone[]>();
    for (const z of zones) {
      const list = byGarage.get(z.garageId) ?? [];
      list.push(z);
      byGarage.set(z.garageId, list);
    }
    return garages.map((g) => ({ garage: g, zones: byGarage.get(g.id) ?? [] }));
  }, (row) => row.garage.id);
}

export async function findById(id: number): Promise<Garage | null> {
  return garageCache.getOne(id)?.garage ?? garageRepo().findOneBy({ id });
}

export async function getZones(garageId: number): Promise<GarageZone[]> {
  return garageCache.getOne(garageId)?.zones ?? zoneRepo().findBy({ garageId });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createGarage(
  type: GarageType,
  name: string,
  parkFee: number,
  x: number, y: number, z: number,
  defaultZones: Array<{ key: string; dx: number; dy: number; dz?: number }> = [],
): Promise<Garage> {
  const g = garageRepo().create({ type, name, parkFee, x, y, z });
  await garageRepo().save(g);

  const zones: GarageZone[] = [];
  for (const { key, dx, dy, dz = 0 } of defaultZones) {
    const zone = zoneRepo().create({ garageId: g.id, zoneKey: key, x: x + dx, y: y + dy, z: z + dz });
    await zoneRepo().save(zone);
    zones.push(zone);
  }

  garageCache.set(g.id, { garage: g, zones });
  return g;
}

export async function updateGarage(
  garage: Garage,
  patch: Partial<Pick<Garage, 'name' | 'parkFee'>>,
): Promise<void> {
  Object.assign(garage, patch);
  await garageRepo().save(garage);
  const row = garageCache.getOne(garage.id);
  if (row) garageCache.set(garage.id, { ...row, garage });
}

export async function upsertZone(
  garageId: number,
  zoneKey: string,
  x: number, y: number, z: number,
  heading = 0,
): Promise<void> {
  let zone = await zoneRepo().findOneBy({ garageId, zoneKey });
  if (zone) {
    zone.x = x; zone.y = y; zone.z = z; zone.heading = heading;
  } else {
    zone = zoneRepo().create({ garageId, zoneKey, x, y, z, heading });
  }
  await zoneRepo().save(zone);

  const row = garageCache.getOne(garageId);
  if (row) {
    const idx = row.zones.findIndex((z) => z.zoneKey === zoneKey);
    if (idx >= 0) row.zones[idx] = zone;
    else row.zones.push(zone);
  }
}

export async function deleteGarage(id: number): Promise<void> {
  await garageRepo().delete(id);
  garageCache.delete(id);
}

// ── Vehicle operations ────────────────────────────────────────────────────────

/**
 * Returns all PlayerVehicle rows stored in a specific garage for a character.
 * Only vehicles with garageId = garageId are returned.
 */
export async function getParkedVehicles(
  garageId: number,
  characterId: number,
): Promise<PlayerVehicle[]> {
  return vehicleRepo().findBy({ garageId, characterId, state: 'GARAGED' });
}

/**
 * Parks a vehicle: sets garageId and marks it as parked.
 * The vehicle should be despawned by the caller after this.
 */
export async function parkVehicle(
  vehicle: PlayerVehicle,
  garageId: number,
): Promise<void> {
  vehicle.garageId = garageId;
  vehicle.state    = 'GARAGED';
  await vehicleRepo().save(vehicle);
}

/**
 * Retrieves a vehicle from a garage: clears garageId.
 * The caller is responsible for spawning the vehicle.
 */
export async function retrieveVehicle(vehicle: PlayerVehicle): Promise<void> {
  vehicle.garageId = null;
  vehicle.state    = 'SPAWNED';
  await vehicleRepo().save(vehicle);
}
