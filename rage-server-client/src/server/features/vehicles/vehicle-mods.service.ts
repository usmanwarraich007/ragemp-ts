import { AppDataSource } from '../../database/data-source';
import { VehicleMod } from './vehicle-mods.entity';
import type { VehicleModDto } from '@ragemp/shared';

const repo = () => AppDataSource.getRepository(VehicleMod);

export function toDto(mods: VehicleMod[]): VehicleModDto[] {
  return mods.map((m) => ({ modType: m.modType, modIndex: m.modIndex }));
}

export async function findByVehicle(vehicleId: number): Promise<VehicleMod[]> {
  return repo().findBy({ vehicleId });
}

export async function applyMod(vehicleId: number, modType: number, modIndex: number): Promise<void> {
  const existing = await repo().findOneBy({ vehicleId, modType });
  if (existing) {
    existing.modIndex = modIndex;
    await repo().save(existing);
  } else {
    await repo().save(repo().create({ vehicleId, modType, modIndex }));
  }
}

export async function removeMod(vehicleId: number, modType: number): Promise<void> {
  await repo().delete({ vehicleId, modType });
}

export function applyToVariable(mods: VehicleMod[], mp: VehicleMp): void {
  const obj: Record<string, number> = {};
  for (const m of mods) obj[String(m.modType)] = m.modIndex;
  mp.setVariable('mods', JSON.stringify(obj));
}
