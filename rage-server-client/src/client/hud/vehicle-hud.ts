import { browserManager } from '../browser';

let wasInVehicle = false;

/**
 * Vehicle HUD — pushes speedometer data to the CEF on every render tick.
 * Sends delta updates only (when values actually change) to avoid flooding
 * the browser with redundant messages.
 */
const state = {
  speed:  -1,
  gear:   -99,
  engine: false,
  lights: false,
  locked: false,
  fuel:   -1,
};

mp.events.add('render', () => {
  const player = mp.players.local;
  const inVehicle = player.vehicle !== null;

  // ── Enter vehicle ──────────────────────────────────────────────
  if (inVehicle && !wasInVehicle) {
    wasInVehicle = true;
    browserManager.emit('hud', 'setVehicleData', { key: 'isActive', data: true });

    // Push the authoritative lock state immediately on entry so the HUD icon is
    // correct from the first frame — don't wait for the next render-loop delta tick.
    const initialLocked = player.vehicle?.getVariable('locked') === true;
    state.locked = initialLocked;
    browserManager.emit('hud', 'setVehicleData', { key: 'locked', data: initialLocked });
  }

  // ── Exit vehicle ───────────────────────────────────────────
  if (!inVehicle && wasInVehicle) {
    wasInVehicle = false;
    state.speed  = -1;
    state.gear   = -99;
    state.engine = false;
    state.lights = false;
    state.locked = false;
    state.fuel   = -1;

    browserManager.emit('hud', 'setVehicleData', { key: 'isActive', data: false });
    browserManager.emit('hud', 'setVehicleData', { key: 'speed',    data: 0 });
    browserManager.emit('hud', 'setVehicleData', { key: 'gear',     data: 0 });
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
  const engine = Boolean(vehicle.getIsEngineRunning());
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

  // ── Locked (read from shared variable — server-authoritative, no native lag) ────
  const locked = vehicle.getVariable('locked') === true;
  if (locked !== state.locked) {
    state.locked = locked;
    browserManager.emit('hud', 'setVehicleData', { key: 'locked', data: locked });
  }

  // ── Fuel (read from shared variable set by the server) ────────
  // Falls back to 0 if the vehicle is unmanaged (no dbId).
  const rawFuel  = Math.round(vehicle.getVariable('fuel') as number ?? 0);
  if (rawFuel !== state.fuel) {
    state.fuel = rawFuel;
    browserManager.emit('hud', 'setVehicleData', { key: 'fuel', data: rawFuel });
  }
});
