import { Rpc, notify, log } from '../../core';

class VehicleDoorFeature {
  @Rpc('vehicle:door:toggle')
  static toggleDoor(
    player: PlayerMp,
    vehicleRemoteId: number,
    doorIndex: number,
    currentlyOpen: boolean,
  ): { isOpen: boolean } {
    const vehicle = mp.vehicles.at(vehicleRemoteId);
    if (!vehicle) {
      notify(player).screen.error('Vehicle not found.');
      return { isOpen: false };
    }

    const isLocked = vehicle.getVariable('locked') as boolean | undefined;
    if (isLocked) {
      notify(player).screen.error('The vehicle is locked.');
      return { isOpen: false };
    }

    const newState = !currentlyOpen;
    vehicle.setVariable(`door:${doorIndex}`, newState);
    log.info('[VehicleDoor]', `${player.name} ${newState ? 'opened' : 'closed'} door ${doorIndex} on veh#${vehicleRemoteId}`);
    return { isOpen: newState };
  }
}

mp.events.add('vehicleDestroyed', (vehicle: VehicleMp) => {
  for (let i = 0; i < 6; i++) vehicle.setVariable(`door:${i}`, false);
});

void VehicleDoorFeature;
