/**
 * vehicle-controls.client.ts — In-vehicle key bindings & event wiring.
 *
 * Key map:
 *   Arrow Up   (38) — engine ON    (driver seat only)
 *   Arrow Down (40) — engine OFF   (driver seat only)
 *   K          (75) — toggle lock  (inside vehicle OR on foot ≤ 2 m)
 *   G          (71) — enter nearest vehicle as passenger
 *
 * Engine state is server-authoritative: key presses call the server via RPC,
 * which sets a shared variable; addDataHandler on every client applies the
 * native. No per-frame enforcement needed.
 *
 * GTA auto-start is disabled via mp.game.vehicle.defaultEngineBehaviour = false
 * and PED_FLAG_STOP_ENGINE_TURNING (flag 479).
 */

import { clientRpc }    from '../rpc/clientRpc';
import { isShowcasing } from '../business/handlers/dealership-preview.client';
import {
  isLocalPlayerDriver,
  findNearestVehicle,
  findNearestFreePassengerSeat,
} from './vehicle-utils.client';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Global flags
// ─────────────────────────────────────────────────────────────────────────────

// Prevent GTA from auto-starting the engine when a player enters a vehicle.
mp.game.vehicle.defaultEngineBehaviour = false;
// PED_FLAG_STOP_ENGINE_TURNING (479): suppress the "trying to start" fidget anim.
mp.players.local.setConfigFlag(479, true);
// DisableForceOutWhenInVehicle (186): no door-handle shake on locked vehicles.
mp.players.local.setConfigFlag(186, true);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Key bindings
// ─────────────────────────────────────────────────────────────────────────────

// ── Arrow Up / Down — Engine ON / OFF ────────────────────────────────────────

function trySetEngine(on: boolean): void {
  if (isShowcasing()) return; // locked during dealership preview
  const player  = mp.players.local;
  const vehicle = player.vehicle;
  if (!vehicle) return;
  // Must be in the driver seat to start / stop the engine
  if (!isLocalPlayerDriver(player, vehicle)) return;
  void clientRpc.callServer('vehicle:setEngine', vehicle.remoteId, on);
}

mp.keys.bind(38, false, () => trySetEngine(true));   // Arrow Up   → engine ON
mp.keys.bind(40, false, () => trySetEngine(false));  // Arrow Down → engine OFF

// ── K — Toggle lock ──────────────────────────────────────────────────────────

function tryToggleLock(): void {
  const player  = mp.players.local;
  const vehicle = player.vehicle;

  // Allow from inside the vehicle or on foot within 2.5 m
  const targetVehicle = vehicle ?? findNearestVehicle(player.position, 2.5);
  if (!targetVehicle) return;

  void clientRpc.callServer('vehicle:toggleLock', targetVehicle.remoteId).catch(() => {
    // Server rejected — no local state to revert
  });
}

mp.keys.bind(75, false, tryToggleLock);

// ── G — Enter nearest vehicle as passenger ────────────────────────────────────

function tryEnterAsPassenger(): void {
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

  // taskEnterVehicle animates the ped walking to and entering the vehicle.
  // seatIndex 0 = front-right, 1 = rear-left, etc. — never -1 (driver).
  // p6 = overrideClipSet: typings say number but native requires string — cast to satisfy TS.
  mp.game.task.taskEnterVehicle(player.handle, target.handle, 5000, seat, 1.0, 1, '' as any);
}

mp.keys.bind(71, false, tryEnterAsPassenger);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Event handlers
// ─────────────────────────────────────────────────────────────────────────────

// ── Render loop: seat-slide & locked-vehicle entry blocks ────────────────────
// Suppress control 23 to prevent:
//   (a) auto-sliding to an empty driver seat when sitting as a passenger.
//   (b) the door-handle animation when approaching a locked vehicle on foot.

mp.events.add('render', () => {
  const player = mp.players.local;
  const veh    = player.vehicle;

  if (veh?.handle && !isLocalPlayerDriver(player, veh)) {
    if (veh.isSeatFree(-1)) {
      mp.game.controls.disableControlAction(0, 23, true);
    }
  }

  if (!veh) {
    const nearest = findNearestVehicle(player.position, 5.0);
    if (nearest?.getVariable('locked') === true) {
      mp.game.controls.disableControlAction(0, 23, true);
    }
  }
});

// ── playerEnterVehicle: enforce engine state & keep-running flag ─────────────
// seat === -1 is the driver seat in RAGE:MP's playerEnterVehicle signature.

mp.events.add('playerEnterVehicle', (vehicle: VehicleMp, seat: number) => {
  if (seat !== -1) return; // only care about the driver seat

  // Flag 429 keeps the engine running when the driver exits.
  // Must be set each entry (not just globally) to apply to the current vehicle.
  mp.players.local.setConfigFlag(429, true);

  const engineOn = vehicle.getVariable('engineOn') as boolean | undefined;
  const isOn = engineOn === true;

  vehicle.setEngineOn(isOn, true, true);
  vehicle.setUndriveable(!isOn);
  vehicle.setLights(!isOn ? 1 : 0);
});

// ── playerLeaveVehicle: restore engine state after GTA's shutdown routine ────
// GTA's engine-shutdown runs AFTER playerLeaveVehicle fires, so we wait 500 ms
// then restore the server-authoritative state.

mp.events.add('playerLeaveVehicle', (vehicle: VehicleMp) => {
  if (!vehicle?.handle) return; // vehicle may be null if destroyed while occupied

  const engineOn = vehicle.getVariable('engineOn') as boolean | undefined;
  if (engineOn !== true) return; // engine was already off — let GTA do its thing

  setTimeout(() => {
    if (!mp.vehicles.exists(vehicle)) return;
    vehicle.setEngineOn(true, true, false);
    vehicle.setUndriveable(false); // still driveable for the next person
    vehicle.setLights(0);          // reset to normal auto-mode
  }, 500);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Reactive data handlers (server variable → client native)
// ─────────────────────────────────────────────────────────────────────────────

// RAGE:MP fires addDataHandler on every client that has the vehicle streamed in
// the moment the server calls setVariable. No manual broadcast needed.

// ── engineOn ─────────────────────────────────────────────────────────────────

mp.events.addDataHandler('engineOn', (entity: EntityMp, value: unknown) => {
  if (entity.type !== 'vehicle') return;
  const veh = entity as VehicleMp;
  if (!veh.handle) return;

  const isOn = value === true;
  if (Boolean(veh.getIsEngineRunning()) === isOn) return; // already correct state

  veh.setEngineOn(isOn, true, true);
  veh.setUndriveable(!isOn);    // prevent rolling when engine is off
  veh.setLights(!isOn ? 1 : 0); // cut lights on engine-off; reset on start
});

// ── locked ────────────────────────────────────────────────────────────────────
// oldValue === undefined means this is a stream-in — skip sound / animation.

mp.events.addDataHandler('locked', (entity: EntityMp, value: unknown, oldValue: unknown) => {
  if (entity.type !== 'vehicle') return;
  const veh = entity as VehicleMp;
  if (!veh.handle) return;

  const locked     = value === true;
  const isStreamIn = oldValue === undefined;

  veh.setDoorsLocked(locked ? 2 : 1);

  if (!isStreamIn) {
    veh.setDoorsShut(true);
    mp.game.audio.playVehicleDoorCloseSound(veh.handle, 0);
    mp.game.audio.playSoundFromEntity(
      -1,
      locked ? 'Remote_Control_Fob_Click_With_Stutter' : 'Remote_Control_Fob_Click',
      veh.handle,
      'PI_Menu_Sounds',
      false,
      0,
    );

    const local = mp.players.local;
    if (!local.vehicle) playFobAnimation(local);

    if (local.getIsTaskActive(160) || local.getIsTaskActive(161)) {
      local.clearTasksImmediately();
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Animations
// ─────────────────────────────────────────────────────────────────────────────

async function playFobAnimation(player: PlayerMp): Promise<void> {
  const dict = 'anim@mp_player_intmenu@key_fob@';
  const anim = 'fob_click';

  mp.game.streaming.requestAnimDict(dict);
  while (!mp.game.streaming.hasAnimDictLoaded(dict)) {
    await mp.game.waitAsync(0);
  }

  player.taskPlayAnim(dict, anim, 8.0, -8.0, 1000, 48, 0, false, false, false);
}