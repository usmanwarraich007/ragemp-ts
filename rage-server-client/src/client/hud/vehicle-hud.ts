import { browserManager } from '../browser';

let wasInVehicle = false;

/**
 * Vehicle HUD — pushes speedometer data to the CEF on every render tick.
 * Sends delta updates only (when values actually change) to avoid flooding
 * the browser with redundant messages.
 */
const state = {
  speed: -1,
  gear: -99,
  engine: false,
  lights: false,
  locked: false,
};

mp.events.add('render', () => {
  const player = mp.players.local;
  const inVehicle = player.vehicle !== null;

  // ── Enter vehicle ──────────────────────────────────────────
  if (inVehicle && !wasInVehicle) {
    wasInVehicle = true;
    browserManager.emit('hud', 'setVehicleData', { key: 'isActive', data: true });
  }

  // ── Exit vehicle ───────────────────────────────────────────
  if (!inVehicle && wasInVehicle) {
    wasInVehicle = false;
    state.speed = -1;
    state.gear = -99;
    state.engine = false;
    state.lights = false;
    state.locked = false;

    browserManager.emit('hud', 'setVehicleData', { key: 'isActive', data: false });
    browserManager.emit('hud', 'setVehicleData', { key: 'speed', data: 0 });
    browserManager.emit('hud', 'setVehicleData', { key: 'gear', data: 0 });
    return;
  }

  if (!inVehicle || !player.vehicle) return;

  const vehicle = player.vehicle;

  // ── Speed (m/s → km/h) ────────────────────────────────────
  const rawSpeed = Math.round(vehicle.getSpeed() * 3.6);
  if (rawSpeed !== state.speed) {
    state.speed = rawSpeed;
    browserManager.emit('hud', 'setVehicleData', { key: 'speed', data: rawSpeed });
  }

  // ── Gear (property on VehicleMp) ──────────────────────────
  const gear = vehicle.gear;
  if (gear !== state.gear) {
    state.gear = gear;
    browserManager.emit('hud', 'setVehicleData', { key: 'gear', data: gear });
  }

  // ── Engine ────────────────────────────────────────────────
  const engine = vehicle.getIsEngineRunning() !== 0;
  if (engine !== state.engine) {
    state.engine = engine;
    browserManager.emit('hud', 'setVehicleData', { key: 'engine', data: engine });
  }

  // ── Lights (getLightsState uses two ref args) ─────────────
  const lightsState = vehicle.getLightsState(0, 0);
  const lights = lightsState.lightsOn;
  if (lights !== state.lights) {
    state.lights = lights;
    browserManager.emit('hud', 'setVehicleData', { key: 'lights', data: lights });
  }

  // ── Locked (getDoorLockStatus: 0-1 = unlocked, 2+ = locked) ─
  const lockStatus = vehicle.getDoorLockStatus();
  const locked = lockStatus >= 2;
  if (locked !== state.locked) {
    state.locked = locked;
    browserManager.emit('hud', 'setVehicleData', { key: 'locked', data: locked });
  }
});
