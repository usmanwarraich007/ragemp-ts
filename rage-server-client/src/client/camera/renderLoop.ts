/**
 * camera/renderLoop.ts — Frame-accurate orbital camera controller.
 *
 * Runs on every RAGE:MP render event (~60 fps) using GTA V's raw control API:
 *   - mp.game.controls.getDisabledControlNormal(0, 1/2) — mouse X/Y delta
 *   - mp.game.controls.isDisabledControlPressed(0, 241/242) — scroll wheel
 *
 * This approach removes all CEF→client latency from camera movement.
 * CEF only needs to signal drag start/stop (2 events total per drag gesture).
 *
 * Orbital coordinate system (matches the reference project):
 *   polarAngle   — horizontal rotation around the target (0°–360°)
 *   azimuthAngle — vertical elevation (small = above looking down, 90 = eye level)
 *   radius       — negative = camera behind the target point (GTA convention)
 *
 * Camera position formula:
 *   x = target.x + radius * sin(azimuth) * cos(polar)
 *   y = target.y - radius * sin(azimuth) * sin(polar)
 *   z = target.z - radius * cos(azimuth)
 *
 * Then camera.pointAtCoord(target) auto-aims — no manual yaw/pitch needed.
 */

import { cameraManager } from './manager';
import { easeInOut } from './bezierEasing';

// ── Constants ─────────────────────────────────────────────────────────────────

const ORBIT_SPEED   = 8;    // degrees per unit of mouse input
const SCROLL_STEP   = 0.1;  // metres per scroll tick
const DEFAULT_TRANSITION_MS = 400; // bone-switch transition duration (ms)

// GTA V control indices
const CTRL_MOUSE_X       = 1;
const CTRL_MOUSE_Y       = 2;
const CTRL_SCROLL_UP     = 241;
const CTRL_SCROLL_DOWN   = 242;

// ── State ─────────────────────────────────────────────────────────────────────

interface OrbitState {
  enabled:      boolean;
  isDragging:   boolean;
  polarAngle:   number;
  azimuthAngle: number;
  azimuthMin:   number;
  azimuthMax:   number;
  radius:       number;
  radiusMin:    number;
  radiusMax:    number;
  /** Current interpolated look-target position. */
  target:       mp.Vector3;
  /** Where the transition starts from. */
  transFrom:    mp.Vector3;
  /** Where the transition is heading. */
  transTo:      mp.Vector3;
  /** Transition start timestamp (ms), 0 = no active transition. */
  transStart:   number;
  /** Transition duration (ms). */
  transDur:     number;
  /** True while the cursor is over the left menu panel — suppress scroll zoom. */
  panelHovered: boolean;
}

const state: OrbitState = {
  enabled:      false,
  isDragging:   false,
  polarAngle:   270,
  azimuthAngle: 90,
  azimuthMin:   80,
  azimuthMax:   160,
  radius:       -1.5,
  radiusMin:    -3.0,
  radiusMax:    -0.5,
  target:     new mp.Vector3(0, 0, 0),
  transFrom:  new mp.Vector3(0, 0, 0),
  transTo:    new mp.Vector3(0, 0, 0),
  transStart: 0,
  transDur:   0,
  panelHovered: false,
};

// ── Render loop ───────────────────────────────────────────────────────────────

mp.events.add('render', () => {
  if (!state.enabled) return;

  const camera = cameraManager.activeCamera;
  if (!camera) return;

  // ── Scroll to zoom (only when cursor is NOT over the panel) ──────────────────────
  if (!state.panelHovered) {
    if (mp.game.controls.isDisabledControlPressed(0, CTRL_SCROLL_UP)) {
      state.radius = Math.min(state.radiusMax, state.radius + SCROLL_STEP); // scroll up = zoom in
    }
    if (mp.game.controls.isDisabledControlPressed(0, CTRL_SCROLL_DOWN)) {
      state.radius = Math.max(state.radiusMin, state.radius - SCROLL_STEP); // scroll down = zoom out
    }
  }

  // ── Mouse drag to orbit ────────────────────────────────────────────────────
  if (state.isDragging) {
    const mx = mp.game.controls.getDisabledControlNormal(0, CTRL_MOUSE_X);
    const my = mp.game.controls.getDisabledControlNormal(0, CTRL_MOUSE_Y);

    state.polarAngle = (state.polarAngle + mx * ORBIT_SPEED + 360) % 360;
    state.azimuthAngle = Math.max(
      state.azimuthMin,
      Math.min(state.azimuthMax, state.azimuthAngle - my * ORBIT_SPEED), // invert Y: drag up = camera higher
    );
  }

  // ── Bezier transition ─────────────────────────────────────────────────────
  if (state.transStart > 0) {
    const elapsed = Date.now() - state.transStart;
    const rawT    = Math.min(1, elapsed / state.transDur);
    const easedT  = easeInOut(rawT);
    const f = state.transFrom;
    const to = state.transTo;
    state.target = new mp.Vector3(
      f.x + (to.x - f.x) * easedT,
      f.y + (to.y - f.y) * easedT,
      f.z + (to.z - f.z) * easedT,
    );
    if (rawT >= 1) state.transStart = 0; // transition complete
  }

  // ── Compute and apply camera position ─────────────────────────────────────
  const polarRad   = state.polarAngle   * Math.PI / 180;
  const azimuthRad = state.azimuthAngle * Math.PI / 180;

  const cx = state.target.x + state.radius * Math.sin(azimuthRad) * Math.cos(polarRad);
  const cy = state.target.y - state.radius * Math.sin(azimuthRad) * Math.sin(polarRad);
  const cz = state.target.z - state.radius * Math.cos(azimuthRad);

  (camera as any).setCoord(cx, cy, cz);
  (camera as any).pointAtCoord(state.target.x, state.target.y, state.target.z);
});

// ── Public API ────────────────────────────────────────────────────────────────

export interface OrbitConfig {
  polarAngle?:   number;
  azimuthAngle?: number;
  azimuthMin?:   number;
  azimuthMax?:   number;
  radius?:       number;
  radiusMin?:    number;
  radiusMax?:    number;
  target?:       mp.Vector3;
}

/** Enable orbital camera control with optional initial configuration. */
export function enableOrbit(config: OrbitConfig = {}): void {
  if (config.polarAngle   !== undefined) state.polarAngle   = config.polarAngle;
  if (config.azimuthAngle !== undefined) state.azimuthAngle = config.azimuthAngle;
  if (config.azimuthMin   !== undefined) state.azimuthMin   = config.azimuthMin;
  if (config.azimuthMax   !== undefined) state.azimuthMax   = config.azimuthMax;
  if (config.radius       !== undefined) state.radius       = config.radius;
  if (config.radiusMin    !== undefined) state.radiusMin    = config.radiusMin;
  if (config.radiusMax    !== undefined) state.radiusMax    = config.radiusMax;
  if (config.target) {
    state.target     = config.target;
    state.transFrom  = config.target;
    state.transTo    = config.target;
    state.transStart = 0;
  }
  state.enabled = true;
}

/** Stop orbital camera control. */
export function disableOrbit(): void {
  state.enabled    = false;
  state.isDragging = false;
}

/** Signal that the user started dragging (CEF mousedown). */
export function setDragging(dragging: boolean): void {
  state.isDragging = dragging;
}

/**
 * Update the look-target with a smooth bezier-eased transition.
 * @param pos      Target position to move to.
 * @param duration Transition time in ms (default 400ms).
 */
export function setOrbitTarget(pos: mp.Vector3, duration = DEFAULT_TRANSITION_MS): void {
  state.transFrom  = state.target;
  state.transTo    = pos;
  state.transStart = Date.now();
  state.transDur   = duration;
}

/**
 * Snap the orbit target instantly (no easing) — use on first setup.
 */
export function snapOrbitTarget(pos: mp.Vector3): void {
  state.target     = pos;
  state.transFrom  = pos;
  state.transTo    = pos;
  state.transStart = 0;
}

/**
 * Adjust the orbit radius (positive = zoom out, negative = zoom in).
 * Called by CEF wheel events as a fallback alongside the render-loop scroll.
 */
export function adjustRadius(delta: number): void {
  if (state.panelHovered) return; // also guard the CEF fallback
  state.radius = Math.max(state.radiusMin, Math.min(state.radiusMax, state.radius + delta));
}

/** Called when cursor enters/leaves the left panel — suppresses scroll zoom. */
export function setPanelHovered(hovered: boolean): void {
  state.panelHovered = hovered;
}

/**
 * Rotate the polar (horizontal) angle by `degrees`.
 * Call this whenever the character heading changes so the camera
 * stays front-facing after arrow-key rotation.
 */
export function rotatePolar(degrees: number): void {
  state.polarAngle = (state.polarAngle + degrees + 360) % 360;
}
