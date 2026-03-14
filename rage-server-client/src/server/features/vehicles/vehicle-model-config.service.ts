/**
 * vehicle-model-config.service.ts — CRUD + in-memory cache for VehicleModelConfig.
 *
 * Cache is populated on first read and invalidated on every write.
 * Since this data changes rarely (admin-only), a simple Map is sufficient.
 */

import { AppDataSource } from '../../database/data-source';
import { VehicleModelConfig } from './vehicle-model-config.entity';
import { Cache } from '../../core';
import type { VehicleModelConfigDto } from '@ragemp/shared';

const repo = () => AppDataSource.getRepository(VehicleModelConfig);

const configCache = new Cache<string, VehicleModelConfigDto>();

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toDto(entry: VehicleModelConfig): VehicleModelConfigDto {
  return {
    model:            entry.model,
    label:            entry.label,
    category:         entry.category,
    seats:            entry.seats,
    basePrice:        Number(entry.basePrice),
    fuelCapacity:     entry.fuelCapacity,
    fuelConsume:      entry.fuelConsume,
    trunkVolume:      entry.trunkVolume,
    gloveboxCapacity: entry.gloveboxCapacity,
    repairCost:       Number(entry.repairCost),
    insuranceCost:    Number(entry.insuranceCost),
    speed:            entry.speed,
    accel:            entry.accel,
    traction:         entry.traction,
    brakes:           entry.brakes,
    colors:           entry.colorsRaw ? entry.colorsRaw.split(',').map((c) => c.trim()).filter(Boolean) : [],
    tags:             entry.tagsRaw   ? entry.tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)   : [],
  };
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getAll(): Promise<VehicleModelConfigDto[]> {
  return configCache.getAll(
    async () => (await repo().find({ order: { category: 'ASC', label: 'ASC' } })).map(toDto),
    (c) => c.model,
  );
}

export async function findByModel(model: string): Promise<VehicleModelConfigDto | null> {
  await getAll();
  return configCache.getOne(model) ?? null;
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function upsert(dto: VehicleModelConfigDto): Promise<void> {
  let row = await repo().findOneBy({ model: dto.model });
  if (row) {
    Object.assign(row, {
      label:            dto.label,
      category:         dto.category,
      seats:            dto.seats,
      basePrice:        dto.basePrice,
      fuelCapacity:     dto.fuelCapacity,
      fuelConsume:      dto.fuelConsume,
      trunkVolume:      dto.trunkVolume,
      gloveboxCapacity: dto.gloveboxCapacity,
      repairCost:       dto.repairCost,
      insuranceCost:    dto.insuranceCost,
      speed:            dto.speed,
      accel:            dto.accel,
      traction:         dto.traction,
      brakes:           dto.brakes,
      colorsRaw:        dto.colors.join(','),
      tagsRaw:          dto.tags.join(','),
    });
  } else {
    row = repo().create({
      model:            dto.model,
      label:            dto.label,
      category:         dto.category,
      seats:            dto.seats,
      basePrice:        dto.basePrice,
      fuelCapacity:     dto.fuelCapacity,
      fuelConsume:      dto.fuelConsume,
      trunkVolume:      dto.trunkVolume,
      gloveboxCapacity: dto.gloveboxCapacity,
      repairCost:       dto.repairCost,
      insuranceCost:    dto.insuranceCost,
      speed:            dto.speed,
      accel:            dto.accel,
      traction:         dto.traction,
      brakes:           dto.brakes,
      colorsRaw:        dto.colors.join(','),
      tagsRaw:          dto.tags.join(','),
    });
  }
  await repo().save(row);
  configCache.set(dto.model, dto);
}

export async function deleteByModel(model: string): Promise<boolean> {
  const result = await repo().delete({ model });
  configCache.delete(model);
  return (result.affected ?? 0) > 0;
}
