/**
 * vehicle-trunk.feature.ts — Server-side vehicle door/trunk state manager.
 *
 * All door AND trunk toggling uses 'vehicle:door:toggle' (trunk = doorIndex 5).
 * Door natives are client-only — server tracks state and broadcasts
 * 'vehicle:door:apply' so all nearby clients run the native.
 */
import { Rpc, notify, log } from '../../core';

/** `${vehicleId}:${doorIndex}` → isOpen */
const doorStates = new Map<string, boolean>();

class VehicleDoorsFeature {
  @Rpc('vehicle:door:toggle')
  static toggleDoor(
    player: PlayerMp,
    vehicleRemoteId: number,
    doorIndex: number,
  ): { isOpen: boolean } {
    const vehicle = mp.vehicles.toArray().find((v) => v.id === vehicleRemoteId);

    if (!vehicle) {
      notify(player).screen.error('Vehicle not found.');
      log.warn('[VehicleDoors]', `remoteId ${vehicleRemoteId} not found for ${player.name}`);
      return { isOpen: false };
    }

    const key      = `${vehicle.id}:${doorIndex}`;
    const newState = !(doorStates.get(key) ?? false);
    doorStates.set(key, newState);

    mp.players.forEach((p) => p.call('vehicle:door:apply', [vehicleRemoteId, doorIndex, newState]));
    log.info('[VehicleDoors]', `${player.name} ${newState ? 'opened' : 'closed'} door ${doorIndex} on ${vehicleRemoteId}`);
    return { isOpen: newState };
  }
}

mp.events.add('vehicleDestroyed', (vehicle: VehicleMp) => {
  for (const key of doorStates.keys()) {
    if (key.startsWith(`${vehicle.id}:`)) doorStates.delete(key);
  }
});

void VehicleDoorsFeature;

