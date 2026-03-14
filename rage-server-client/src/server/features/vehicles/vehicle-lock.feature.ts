import { Rpc, notify, log, playerStore } from '../../core';
import { vehicleManager } from './vehicle-manager.server';

class VehicleLockFeature {
  @Rpc('vehicle:toggleLock')
  static toggleLock(
    player: PlayerMp,
    vehicleRemoteId: number,
  ): { locked: boolean } {
    const vehicle = mp.vehicles.at(vehicleRemoteId);
    if (!vehicle) return { locked: true };

    const dbId    = vehicle.getVariable('dbId') as number | undefined;
    const runtime = dbId ? vehicleManager.getRuntime(dbId) : null;
    const charId  = playerStore.get(player).character?.id;

    if (runtime && charId) {
      if (!runtime.hasKey(charId)) {
        notify(player).screen.error('You do not have the keys to this vehicle.');
        return { locked: runtime.dbRow.isLocked };
      }
      runtime.setLocked(!runtime.dbRow.isLocked);
      log.info('[VehicleLock]', `${player.name} ${runtime.dbRow.isLocked ? 'locked' : 'unlocked'} veh#${vehicleRemoteId}`);
      return { locked: runtime.dbRow.isLocked };
    }

    const newLocked = !(vehicle.getVariable('locked') as boolean | undefined);
    vehicle.setVariable('locked', newLocked);
    vehicle.locked = newLocked;
    log.info('[VehicleLock]', `${player.name} ${newLocked ? 'locked' : 'unlocked'} unmanaged veh#${vehicleRemoteId}`);
    return { locked: newLocked };
  }
}

void VehicleLockFeature;
