import { vehicleManager } from './vehicle-manager.server';
import * as configSvc from './vehicle-model-config.service';

const lastPos = new Map<number, { x: number; y: number; z: number }>();

mp.events.add('playerEnterVehicle', (_player: PlayerMp, vehicle: VehicleMp) => {
  const dbId = vehicle.getVariable('dbId') as number | undefined;
  if (!dbId) return;
  const pos = vehicle.position;
  lastPos.set(dbId, { x: pos.x, y: pos.y, z: pos.z });
});

mp.events.add('playerExitVehicle', async (_player: PlayerMp, vehicle: VehicleMp) => {
  const dbId = vehicle.getVariable('dbId') as number | undefined;
  if (!dbId) return;

  const prev = lastPos.get(dbId);
  lastPos.delete(dbId);
  if (!prev) return;

  const runtime = vehicleManager.getRuntime(dbId);
  if (!runtime) return;

  const cur  = vehicle.position;
  const dx   = cur.x - prev.x;
  const dy   = cur.y - prev.y;
  const dz   = cur.z - prev.z;
  const km   = Math.sqrt(dx * dx + dy * dy + dz * dz) / 1000;

  const config = await configSvc.findByModel(runtime.model);
  if (!config) return;

  // Re-check the runtime is still alive — it may have been despawned (parked/stored)
  // while we were awaiting the config query. setFuel touches mp.setVariable which
  // throws "Expired multiplayer object" on a destroyed entity.
  if (!vehicleManager.getRuntime(dbId)) return;

  runtime.setFuel(runtime.dbRow.fuel - km * config.fuelConsume);
  runtime.dbRow.odometer += km;
});