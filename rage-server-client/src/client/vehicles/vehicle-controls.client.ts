/**
 * vehicle-controls.client.ts — In-vehicle key bindings.
 *
 * Arrow Up   (keycode 38) — start engine  (must be in driver seat)
 * Arrow Down (keycode 40) — stop engine   (must be in driver seat)
 * K          (keycode 75) — toggle lock   (in vehicle, or on foot within 5 m)
 * G          (keycode 71) — enter nearest vehicle as passenger (never driver seat)
 *
 * Engine default-off is handled by mp.game.vehicle.defaultEngineBehaviour = false
 * (disables GTA auto-start on entry) + PED_FLAG_STOP_ENGINE_TURNING (flag 479)
 * (suppresses the "trying to start" ped animation). No per-frame enforcement needed.
 *
 * All key presses call the server via RPC so state is authoritative server-side
 * and broadcast to all nearby clients.
 */

import { clientRpc }    from '../rpc/clientRpc';
import { isShowcasing } from '../business/handlers/dealership-preview.client';

// ── Disable GTA auto-start engine behaviour ───────────────────────────────────
// When false: GTA no longer auto-starts the engine when a player enters a vehicle.
// PED_FLAG_STOP_ENGINE_TURNING (479): suppresses the "trying to start engine" ped
// animation so the character doesn't play a weird fidget when entering.
mp.game.vehicle.defaultEngineBehaviour = false;
mp.players.local.setConfigFlag(479, true); // PED_FLAG_STOP_ENGINE_TURNING — no fidget anim
mp.players.local.setConfigFlag(186, true); // DisableForceOutWhenInVehicle — no door-handle shake on locked vehicles


// ── Render loop: seat-slide block ────────────────────────────────────────────
mp.events.add('render', () => {
  const player = mp.players.local;
  const veh    = player.vehicle;

  // ── Block auto-slide to driver seat ─────────────────────────────────────
  // Suppress control 23 when local player is a passenger and driver seat is empty
  if (veh?.handle && !isLocalPlayerDriver(player, veh)) {
    if (veh.isSeatFree(-1)) {
      mp.game.controls.disableControlAction(0, 23, true);
    }
  }

  // ── Block enter attempt on locked vehicles ───────────────────────────────
  // Suppress control 23 when on foot and the nearest vehicle is locked,
  // preventing GTA's door-handle-check animation from playing.
  if (!veh) {
    const nearest = findNearestVehicle(player.position, 5.0);
    if (nearest?.getVariable('locked') === true) {
      mp.game.controls.disableControlAction(0, 23, true);
    }
  }
});

// ── Engine controls (Arrow Up / Down) ────────────────────────────────────────

function trySetEngine(on: boolean): void {
  if (isShowcasing()) return; // engine controls are locked during dealership preview
  const vehicle = mp.players.local.vehicle;
  if (!vehicle) return;
  // Server updates shared variable + broadcasts vehicle:engineChanged to all clients
  void clientRpc.callServer('vehicle:setEngine', vehicle.remoteId, on);
}

// keyup = false → fires once per press
mp.keys.bind(38, false, () => trySetEngine(true));   // Arrow Up   → engine ON
mp.keys.bind(40, false, () => trySetEngine(false));  // Arrow Down → engine OFF

// ── Re-enforce engine state on driver entry ───────────────────────────────────
// Forum method: set flag 429 on every driver entry — this prevents GTA from
// automatically killing the engine when the driver exits the vehicle.
// Also re-enforce the server-authoritative engine state since defaultEngineBehaviour
// alone isn't always reliable.
// seat === -1 is the driver seat in RAGE:MP's playerEnterVehicle signature.
mp.events.add('playerEnterVehicle', (vehicle: VehicleMp, seat: number) => {
  if (seat !== -1) return; // only care about the driver seat

  // Flag 429: PED_FLAG_STOP_ENGINE_TURNING — keeps engine running on exit
  // Must be set each entry (not just globally) to apply to the current vehicle
  mp.players.local.setConfigFlag(429, true);

  const engineOn = vehicle.getVariable('engineOn') as boolean | undefined;
  const isOn = engineOn === true;

  vehicle.setEngineOn(isOn, true, true);
  vehicle.setUndriveable(!isOn);
  vehicle.setLights(!isOn ? 1 : 0);
});

// ── Keep engine running after driver exits ────────────────────────────────────
// GTA's engine shutdown routine runs AFTER playerLeaveVehicle fires, so an
// immediate call gets overwritten. We wait 500 ms for GTA to finish its cleanup
// then restore the server-authoritative state.
mp.events.add('playerLeaveVehicle', (vehicle: VehicleMp) => {
  if (!vehicle?.handle) return; // vehicle may be null if destroyed while occupied (e.g. preview cleanup)

  const engineOn = vehicle.getVariable('engineOn') as boolean | undefined;
  if (engineOn !== true) return; // engine was already off — let GTA do its thing

  setTimeout(() => {
    if (!mp.vehicles.exists(vehicle)) return;
    vehicle.setEngineOn(true, true, false);
    vehicle.setUndriveable(false); // still driveable for the next person
    vehicle.setLights(0);          // lights stay in normal auto-mode when running
  }, 500);
});

// ── Lock toggle (K key) ───────────────────────────────────────────────────────

mp.keys.bind(75, false, () => {
  const player = mp.players.local;
  const vehicle = player.vehicle;

  // Allow from inside or on foot within 5 m of the nearest vehicle
  const targetVehicle = vehicle ?? findNearestVehicle(player.position, 2.0);
  if (!targetVehicle) return;

  void clientRpc.callServer('vehicle:toggleLock', targetVehicle.remoteId).catch(() => {
    // Server rejected — no local state to revert
  });
});

// ── G key — Enter nearest vehicle as passenger ────────────────────────────────

mp.keys.bind(71, false, () => {
  const player = mp.players.local;
  if (player.vehicle) return; // already in a vehicle

  const target = findNearestVehicle(player.position, 5.0);
  if (!target) return;

  // Reject if vehicle is locked
  const locked = target.getVariable('locked') as boolean | undefined;
  if (locked) {
    mp.gui.chat.push('!{FF6644}Vehicle is locked.');
    return;
  }

  const seat = findNearestFreePassengerSeat(target, player.position);
  if (seat === -99) {
    mp.gui.chat.push('!{FFAA00}No free passenger seats.');
    return;
  }

  // taskEnterVehicle animates the ped walking to and entering the vehicle
  // seatIndex 0 = front-right, 1 = rear-left, etc. — never -1 (driver)
  // p6 = overrideClipSet: typings say number but native requires string — cast to satisfy TS
  mp.game.task.taskEnterVehicle(player.handle, target.handle, 5000, seat, 1.0, 1, '' as any);
});



function findNearestVehicle(pos: Vector3, maxDist: number): VehicleMp | null {
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

/** Returns true if the local player is currently in the driver seat. */
function isLocalPlayerDriver(player: PlayerMp, vehicle: VehicleMp): boolean {
  // getPedInSeat(-1) returns the ped handle in the driver seat; 0 = empty
  return vehicle.getPedInSeat(-1) === player.handle;
}

/**
 * Seat bone names indexed by passenger seat index (0 = front-right, 1 = rear-left, etc.)
 * Used to get the world position of each seat so we can pick the closest one.
 */
const SEAT_BONES: Record<number, string> = {
  0: 'seat_pside_f',   // front passenger (right)
  1: 'seat_dside_r',   // rear driver-side (left)
  2: 'seat_pside_r',   // rear passenger-side (right)
  3: 'seat_dside_r2',  // rear-most left  (e.g. vans / buses)
  4: 'seat_pside_r2',  // rear-most right
};

/**
 * Returns the passenger seat index (≥ 0) that is both free AND closest to the
 * given world position. Driver seat (-1) is never considered.
 * Returns -99 if no free passenger seats exist.
 */
function findNearestFreePassengerSeat(vehicle: VehicleMp, playerPos: Vector3): number {
  const maxPassengers = vehicle.getMaxNumberOfPassengers();
  let bestSeat = -99;
  let bestDist = Infinity;

  for (let seat = 0; seat < maxPassengers; seat++) {
    if (!vehicle.isSeatFree(seat)) continue;

    // Try to get the seat's world position via its entry bone
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

// ── Reactive state sync via addDataHandler ────────────────────────────────────
// RAGE:MP fires these automatically on every client that has the vehicle streamed
// in the moment the server calls setVariable. No manual broadcast needed.

// Engine: apply native + setUndriveable/setLights to match engine state
mp.events.addDataHandler('engineOn', (entity: EntityMp, value: unknown) => {
  if (entity.type !== 'vehicle') return;
  const veh = entity as VehicleMp;
  if (!veh.handle) return;

  const isOn = value === true;
  // Guard: skip if already in the correct state
  if (Boolean(veh.getIsEngineRunning()) === isOn) return;

  veh.setEngineOn(isOn, true, true);
  veh.setUndriveable(!isOn);    // prevent rolling when engine is off
  veh.setLights(!isOn ? 1 : 0); // cut lights on engine-off; reset on start
});

// Lock: apply door lock native
// oldValue === undefined means this is a stream-in (first assignment) — skip sound/animation
mp.events.addDataHandler('locked', (entity: EntityMp, value: unknown, oldValue: unknown) => {
  if (entity.type !== 'vehicle') return;
  const veh = entity as VehicleMp;
  if (!veh.handle) return;

  const locked = value === true;
  const isStreamIn = oldValue === undefined;

  // Always apply the door lock state
  veh.setDoorsLocked(locked ? 2 : 1);

  // Only play sound and close doors on live toggle, not on stream-in
  if (!isStreamIn) {
    veh.setDoorsShut(true);

    mp.game.audio.playVehicleDoorCloseSound(veh.handle, 0);

        // Keep the electronic key-fob "chirp" for UX feedback
        mp.game.audio.playSoundFromEntity(
            -1,
            locked ? 'Remote_Control_Fob_Click_With_Stutter' : 'Remote_Control_Fob_Click',
            veh.handle,
            'PI_Menu_Sounds',
            false,
            0,
        );
       const local = mp.players.local;

    if (!local.vehicle) {
        playFobAnimation(local);
    }

    if (local.getIsTaskActive(160) || local.getIsTaskActive(161)) {
        local.clearTasksImmediately();
    }
  }
});

async function playFobAnimation(player: PlayerMp) {
    const dict = "anim@mp_player_intmenu@key_fob@";
    const anim = "fob_click";

    mp.game.streaming.requestAnimDict(dict);
    while (!mp.game.streaming.hasAnimDictLoaded(dict)) {
        await mp.game.waitAsync(0);
    }

    player.taskPlayAnim(dict, anim, 8.0, -8.0, 1000, 48, 0, false, false, false);
}