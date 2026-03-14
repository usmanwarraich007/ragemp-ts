import { AppDataSource } from '../../database/data-source';
import { PlayerVehicle } from './player-vehicle.entity';

const repo = () => AppDataSource.getRepository(PlayerVehicle);

export async function findById(id: number): Promise<PlayerVehicle | null> {
  return repo().findOneBy({ id });
}

export async function findByCharacter(characterId: number): Promise<PlayerVehicle[]> {
  return repo().findBy({ characterId });
}

export async function findGaraged(garageId: number, characterId: number): Promise<PlayerVehicle[]> {
  return repo().findBy({ garageId, characterId, state: 'GARAGED' });
}

export async function createVehicle(
  characterId: number,
  model:       string,
  plate:       string,
  fuelCapacity: number,
): Promise<PlayerVehicle> {
  const vehicle = repo().create({
    characterId,
    model,
    plate,
    fuel:     fuelCapacity,
    isLocked: true,
    state:    'GARAGED',
  });
  return repo().save(vehicle);
}

export async function save(vehicle: PlayerVehicle): Promise<PlayerVehicle> {
  return repo().save(vehicle);
}
