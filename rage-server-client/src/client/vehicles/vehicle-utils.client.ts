/**
 * vehicle-utils.client.ts — Pure vehicle helper functions.
 *
 * No side effects, no event registrations — safe to import anywhere.
 */

/**
 * Seat bone names indexed by passenger seat index (0 = front-right, 1 = rear-left, etc.)
 * Used to get the world position of each seat so we can pick the closest one.
 */
export const SEAT_BONES: Record<number, string> = {
  0: 'seat_pside_f',   // front passenger (right)
  1: 'seat_dside_r',   // rear driver-side (left)
  2: 'seat_pside_r',   // rear passenger-side (right)
  3: 'seat_dside_r2',  // rear-most left  (e.g. vans / buses)
  4: 'seat_pside_r2',  // rear-most right
};

/** Returns true if the local player is currently in the driver seat. */
export function isLocalPlayerDriver(player: PlayerMp, vehicle: VehicleMp): boolean {
  // getPedInSeat(-1) returns the ped handle in the driver seat; 0 = empty
  return vehicle.getPedInSeat(-1) === player.handle;
}

/** Returns the nearest vehicle within `maxDist` metres, or null. */
export function findNearestVehicle(pos: Vector3, maxDist: number): VehicleMp | null {
  let nearest: VehicleMp | null = null;
  let bestDist = maxDist;

  mp.vehicles.toArray().forEach((veh) => {
    const vpos = veh.position;
    const dist = mp.game.system.vdist(pos.x, pos.y, pos.z, vpos.x, vpos.y, vpos.z);
    if (dist < bestDist) {
      bestDist = dist;
      nearest  = veh;
    }
  });

  return nearest;
}

/**
 * Returns the passenger seat index (≥ 0) that is both free AND closest to the
 * given world position. Driver seat (-1) is never considered.
 * Returns -99 if no free passenger seats exist.
 */
export function findNearestFreePassengerSeat(vehicle: VehicleMp, playerPos: Vector3): number {
  const maxPassengers = vehicle.getMaxNumberOfPassengers();
  let bestSeat = -99;
  let bestDist = Infinity;

  for (let seat = 0; seat < maxPassengers; seat++) {
    if (!vehicle.isSeatFree(seat)) continue;

    const boneName = SEAT_BONES[seat] ?? `seat_${seat}`;
    const boneIdx  = vehicle.getBoneIndexByName(boneName);

    if (boneIdx !== -1) {
      const bonePos = mp.game.entity.getWorldPositionOfBone(vehicle.handle, boneIdx);
      const dist = mp.game.system.vdist(
        playerPos.x, playerPos.y, playerPos.z,
        bonePos.x,   bonePos.y,   bonePos.z,
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestSeat = seat;
      }
    } else if (bestSeat === -99) {
      // No bone found — fall back to this seat rather than returning nothing
      bestSeat = seat;
    }
  }

  return bestSeat;
}
