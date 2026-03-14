import { Rpc, notify, log, playerStore } from '../../core';
import { vehicleManager } from './vehicle-manager.server';

class VehicleEngineFeature {
  @Rpc('vehicle:setEngine')
  static setEngine(
    player: PlayerMp,
    vehicleRemoteId: number,
    on: boolean,
  ): { ok: boolean } {
    const vehicle = mp.vehicles.at(vehicleRemoteId);
    if (!vehicle) return { ok: false };

    if (player.vehicle?.id !== vehicleRemoteId) {
      notify(player).screen.error('You must be in the vehicle to control the engine.');
      return { ok: false };
    }

    const dbId    = vehicle.getVariable('dbId') as number | undefined;
    const runtime = dbId ? vehicleManager.getRuntime(dbId) : null;
    const charId  = playerStore.get(player).character?.id;

    if (runtime && charId && !runtime.hasKey(charId)) {
      notify(player).screen.error('You do not have the keys to this vehicle.');
      return { ok: false };
    }

    if (runtime) {
      runtime.setEngine(on);
    } else {
      vehicle.setVariable('engineOn', on);
    }

    log.info('[VehicleEngine]', `${player.name} turned engine ${on ? 'ON' : 'OFF'} on veh#${vehicleRemoteId}`);
    return { ok: true };
  }
}

mp.events.add('playerExitVehicle', (player: PlayerMp, vehicle: VehicleMp) => {
  const dbId    = vehicle.getVariable('dbId') as number | undefined;
  const runtime = dbId ? vehicleManager.getRuntime(dbId) : null;
  if (!runtime) return;
  runtime.syncPosition();
  void pvSvc.save(runtime.dbRow).catch((err) =>
    log.error('[VehicleEngine]', `Failed to save position for veh db#${dbId}`, err),
  );
});

import * as pvSvc from './player-vehicle.service';

void VehicleEngineFeature;
