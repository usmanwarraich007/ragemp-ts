/**
 * admin/noclip.ts — Improved free-fly mode.
 *
 * Based on reference implementation:
 * - Accelerating speed while W/S/A/D is held (ramps up to 8× base)
 * - LMB = fast speed, RMB = slow speed, else normal
 * - Uses setCoordsNoOffset for precise positioning (no velocity drift)
 * - Player turns invisible during noclip, reappears on exit
 * - Drops to ground level on noclip exit
 *
 * Toggle: /noclip → server sends admin:noclipToggle
 */

const CTRL_W     = 32;
const CTRL_S     = 33;
const CTRL_A     = 34;
const CTRL_D     = 35;
const CTRL_SPACE = 321;
const CTRL_LCTRL = 326;
const CTRL_LMB   = 24;
const CTRL_RMB   = 25;

let noclipEnabled = false;

// Acceleration multipliers — reset when key released, ramp while held
const accel = { f: 2.0, l: 2.0, h: 2.0 };
let lastTime  = 0;

mp.events.add('render', () => {
  if (!noclipEnabled) return;

  // 150ms startup grace so position doesn't snap on toggle
  if (new Date().getTime() - lastTime < 150) return;

  const controls = mp.game.controls;
  const player   = mp.players.local;

  // Speed tier: LMB=fast, RMB=slow, else normal
  let speed: number;
  if (controls.isControlPressed(0, CTRL_LMB))      speed = 1.0;
  else if (controls.isControlPressed(0, CTRL_RMB)) speed = 0.02;
  else                                              speed = 0.2;

  // Compute forward direction from camera rotation (pitch = X, yaw = Z)
  const camRot = mp.game.cam.getGameplayCamRot(2);
  const pitch  = camRot.x * Math.PI / 180;
  const yaw    = camRot.z * Math.PI / 180;
  const direction = {
    x:  Math.sin(-yaw) * Math.cos(pitch),
    y:  Math.cos(-yaw) * Math.cos(pitch),
    z:  Math.sin(pitch),
  };
  const pos = player.position;

  // Forward / back (W/S) with acceleration
  if (controls.isControlPressed(0, CTRL_W)) {
    if (accel.f < 8.0) accel.f *= 1.025;
    pos.x += direction.x * accel.f * speed;
    pos.y += direction.y * accel.f * speed;
    pos.z += direction.z * accel.f * speed;
  } else if (controls.isControlPressed(0, CTRL_S)) {
    if (accel.f < 8.0) accel.f *= 1.025;
    pos.x -= direction.x * accel.f * speed;
    pos.y -= direction.y * accel.f * speed;
    pos.z -= direction.z * accel.f * speed;
  } else {
    accel.f = 2.0;
  }

  // Strafe (A/D) — perpendicular to forward direction in XY plane
  if (controls.isControlPressed(0, CTRL_A)) {
    if (accel.l < 8.0) accel.l *= 1.025;
    pos.x += -direction.y * accel.l * speed;
    pos.y +=  direction.x * accel.l * speed;
  } else if (controls.isControlPressed(0, CTRL_D)) {
    if (accel.l < 8.0) accel.l *= 1.05;
    pos.x -= -direction.y * accel.l * speed;
    pos.y -=  direction.x * accel.l * speed;
  } else {
    accel.l = 2.0;
  }

  // Up / down (Space / LCtrl)
  if (controls.isControlPressed(0, CTRL_SPACE)) {
    if (accel.h < 8.0) accel.h *= 1.025;
    pos.z += accel.h * speed;
  } else if (controls.isControlPressed(0, CTRL_LCTRL)) {
    if (accel.h < 8.0) accel.h *= 1.05;
    pos.z -= accel.h * speed;
  } else {
    accel.h = 2.0;
  }

  player.setCoordsNoOffset(pos.x, pos.y, pos.z, false, false, false);
});

// ── Toggle ────────────────────────────────────────────────────────────────────

mp.events.add('admin:noclipToggle', () => {
  noclipEnabled = !noclipEnabled;
  lastTime = new Date().getTime();

  const player = mp.players.local;

  if (noclipEnabled) {
    player.setInvincible(true);
    player.freezePosition(true);
    player.setVisible(false, false);
    // Reset acceleration
    accel.f = accel.l = accel.h = 2.0;
  } else {
    player.setInvincible(false);
    player.freezePosition(false);
    player.setVisible(true, false);
    // Drop to ground
    const p = player.position;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — RAGE:MP typedefs disagree with actual native (5 args at runtime)
    const groundZ = mp.game.gameplay.getGroundZFor3dCoord(p.x, p.y, p.z, 0.0, false) as number;
    player.setCoordsNoOffset(p.x, p.y, groundZ, false, false, false);
  }

  mp.game.graphics.notify(noclipEnabled ? 'Noclip ~g~ON~w~ | LMB=fast RMB=slow WASD+Space/Ctrl' : 'Noclip ~r~OFF');
});

export {};
