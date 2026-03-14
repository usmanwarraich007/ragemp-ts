import { AppDataSource } from '../../database/data-source';
import { VehicleCosmetics } from './vehicle-cosmetics.entity';
import type { VehicleCosmeticsDto } from '@ragemp/shared';

const repo = () => AppDataSource.getRepository(VehicleCosmetics);

export function toDto(c: VehicleCosmetics): VehicleCosmeticsDto {
  return {
    colorPrimary:   c.colorPrimary,
    colorSecondary: c.colorSecondary,
    colorPearl:     c.colorPearl,
    wheelColor:     c.wheelColor,
    wheelType:      c.wheelType,
    windowTint:     c.windowTint,
    livery:         c.livery,
    neonEnabled:    c.neonEnabled,
    neonColorR:     c.neonColorR,
    neonColorG:     c.neonColorG,
    neonColorB:     c.neonColorB,
    xenonColor:     c.xenonColor,
  };
}

export async function findByVehicle(vehicleId: number): Promise<VehicleCosmetics | null> {
  return repo().findOneBy({ vehicleId });
}

export async function create(
  vehicleId: number,
  initial?: Partial<Pick<VehicleCosmetics, 'colorPrimary' | 'colorSecondary'>>,
): Promise<VehicleCosmetics> {
  const row = repo().create({ vehicleId, ...initial });
  return repo().save(row);
}

export async function save(cosmetics: VehicleCosmetics): Promise<VehicleCosmetics> {
  return repo().save(cosmetics);
}

export function applyToVariables(cosmetics: VehicleCosmetics, mp: VehicleMp): void {
  mp.setVariable('colorPrimary',   cosmetics.colorPrimary);
  mp.setVariable('colorSecondary', cosmetics.colorSecondary);
  mp.setVariable('colorPearl',     cosmetics.colorPearl);
  mp.setVariable('wheelColor',     cosmetics.wheelColor);
  mp.setVariable('wheelType',      cosmetics.wheelType);
  mp.setVariable('windowTint',     cosmetics.windowTint);
  mp.setVariable('livery',         cosmetics.livery);
  mp.setVariable('neonEnabled',    cosmetics.neonEnabled);
  mp.setVariable('neonColorR',     cosmetics.neonColorR);
  mp.setVariable('neonColorG',     cosmetics.neonColorG);
  mp.setVariable('neonColorB',     cosmetics.neonColorB);
  mp.setVariable('xenonColor',     cosmetics.xenonColor);
}
