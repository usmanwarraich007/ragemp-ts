import { AppDataSource } from '../../database/data-source';
import { VehicleKey } from './vehicle-keys.entity';
import type { VehicleKeyRole } from '@ragemp/shared';

const repo = () => AppDataSource.getRepository(VehicleKey);

export async function findKeysForVehicle(vehicleId: number): Promise<VehicleKey[]> {
  return repo().findBy({ vehicleId });
}

export async function hasAccess(vehicleId: number, characterId: number): Promise<boolean> {
  const key = await repo().findOneBy({ vehicleId, characterId });
  return key !== null;
}

export async function grantKey(vehicleId: number, characterId: number, role: VehicleKeyRole): Promise<VehicleKey> {
  const existing = await repo().findOneBy({ vehicleId, characterId });
  if (existing) {
    existing.role = role;
    return repo().save(existing);
  }
  return repo().save(repo().create({ vehicleId, characterId, role }));
}

export async function revokeKey(vehicleId: number, characterId: number): Promise<void> {
  await repo().delete({ vehicleId, characterId });
}

export async function createOwnerKey(vehicleId: number, characterId: number): Promise<VehicleKey> {
  return repo().save(repo().create({ vehicleId, characterId, role: 'owner' }));
}
