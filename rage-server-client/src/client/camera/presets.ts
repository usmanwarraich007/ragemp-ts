/**
 * camera/presets.ts — Feature-specific camera presets.
 *
 * Each exported function creates and activates the appropriate scripted camera
 * for a feature. Any feature can import the preset it needs without knowing
 * about the render loop or bone system internals.
 *
 * Available presets:
 *   charCreatorCamera(entity)  — character creator orbit around head bone
 *   stopCreatorCamera()        — teardown with ease-out
 * 
 * Future presets to add here:
 *   barbershopCamera(entity)
 *   tattooCamera(entity)
 *   vehiclePreviewCamera(vehicle)
 */

import { cameraManager } from './manager';
import { enableOrbit, disableOrbit, snapOrbitTarget } from './renderLoop';
import { setLookBone } from './boneCamera';

// ── Sky Hold ──────────────────────────────────────────────────────────────────

/**
 * Create and activate a minimal scripted camera at the sky hold position.
 * This keeps scriptActive=true from the moment the player joins so every
 * subsequent camera switch (char-select, creator) is scripted→scripted with
 * no gameplay camera flash.
 */
export function activateSkyHoldCamera(x: number, y: number, z: number): void {
  cameraManager.create('sky-hold', new mp.Vector3(x, y, z + 5), new mp.Vector3(0, 0, 0), 60);
  cameraManager.activate('sky-hold', false, 0); // instant — no ease from gameplay
}

/** Silently destroy the sky-hold camera (called after char-select cam is active). */
export function destroySkyHoldCamera(): void {
  cameraManager.destroySilent('sky-hold');
}


/**
 * Activate the character creator orbit camera.
 *
 * @param entity  The player/ped to orbit around (local player for char creator).
 * @param heading  Initial GTA world heading of the entity (0 = North). Used to
 *                 place the camera in front of them. Defaults to entity's current heading.
 */
export function charCreatorCamera(entity: PlayerMp): void {
  const heading = (entity as any).getHeading?.() ?? (entity.heading ?? 0);

  // Polar angle that places the camera in front of the player (where they face).
  // Derivation: orbit formula puts camera at (headX + R*cos(p), headY - R*sin(p)).
  // Forward vector for GTA heading H is (-sinH, +cosH).
  // Solving for p: cos(p) = sin(H), sin(p) = cos(H) → p = 90 - H.
  // NOTE: heading+90 (old formula) only works by coincidence at H=0.
  const initialPolar = (90 - heading + 360) % 360;

  // Get head bone as initial orbit target (snap — no lerp on first frame)
  const headCoords = (entity as any).getBoneCoords(12844, 0, 0, 0) as mp.Vector3;
  snapOrbitTarget(headCoords);

  // Compute an initial camera position using spherical formula
  const polarRad   = initialPolar    * Math.PI / 180;
  const azimutRad  = 90             * Math.PI / 180; // eye level
  const radius     = -1.5;

  const cx = headCoords.x + radius * Math.sin(azimutRad) * Math.cos(polarRad);
  const cy = headCoords.y - radius * Math.sin(azimutRad) * Math.sin(polarRad);
  const cz = headCoords.z - radius * Math.cos(azimutRad);

  // Create and activate the scripted camera (position is immediately overridden
  // by the render loop, but we need a valid initial position for creation)
  cameraManager.create(
    'character-creator',
    new mp.Vector3(cx, cy, cz),
    new mp.Vector3(0, 0, 0), // rotation handled by pointAtCoord each frame
    50,
  );
  cameraManager.activate('character-creator', true, 300);

  enableOrbit({
    polarAngle:   initialPolar,
    azimuthAngle: 90,
    azimuthMin:   80,
    azimuthMax:   160,
    radius,
    radiusMin:    -3.0,
    radiusMax:    -0.5,
    target:       headCoords,
  });
}

/** Teardown the character creator camera with ease-out. */
export function stopCreatorCamera(): void {
  disableOrbit();
  cameraManager.destroy('character-creator', true, 300);
}

// ── Character Select ──────────────────────────────────────────────────────────

/**
 * Activate a static front-facing camera for the character select screen.
 * The camera is placed ~1.5 m in front of the player at chest/face height,
 * looking directly at them so the player can see their outfit.
 *
 * @param entity  The local player — must already be at the select position.
 */
export function charSelectCamera(entity: PlayerMp, headingOverride?: number): void {
  // Head bone position for aiming the camera. Fall back to position + height offset.
  const boneCoords = (entity as any).getBoneCoords?.(12844, 0, 0, 0) as { x: number; y: number; z: number } | undefined;
  const headX = boneCoords?.x ?? entity.position.x;
  const headY = boneCoords?.y ?? entity.position.y;
  const headZ = boneCoords?.z ?? (entity.position.z + 0.7);

  // Use caller-supplied heading when available — entity.heading may be stale
  // the same frame setHeading() was called.
  const heading = headingOverride ?? entity.heading ?? 0;

  // GTA V heading convention: 0 = North (+Y). Forward vector = (-sinH, +cosH).
  // Camera must be placed IN FRONT (where the player faces) so pointAtCoord
  // looks back at their face. Previous signs were reversed → camera was behind.
  const headingRad = (heading * Math.PI) / 180;
  const dist = 1.8;
  const camX = headX - dist * Math.sin(headingRad);  // forward X = -sin(H)
  const camY = headY + dist * Math.cos(headingRad);  // forward Y = +cos(H)
  const camZ = headZ - 0.1;

  cameraManager.create(
    'character-select',
    new mp.Vector3(camX, camY, camZ),
    new mp.Vector3(0, 0, 0),
    55,
  );

  // Activate first so activeCamera is available, then point at head
  cameraManager.activate('character-select', true, 500);
  const cam = cameraManager.activeCamera;
  if (cam) (cam as any).pointAtCoord(headX, headY, headZ);
}

/** Teardown the character select camera with ease-out. */
export function stopCharSelectCamera(): void {
  cameraManager.destroy('character-select', true, 500);
}

// ── Barbershop (stub — add proper bone targeting when ready) ──────────────────

// export function barbershopCamera(entity: PlayerMp): void {
//   setLookBone(entity, 'hat', true);
//   cameraManager.create('barbershop', ...);
//   cameraManager.activate('barbershop', true, 300);
//   enableOrbit({ radius: -1.0, radiusMin: -2.0, radiusMax: -0.4 });
// }
//
// export function stopBarbershopCamera(): void {
//   disableOrbit();
//   cameraManager.destroy('barbershop', true, 300);
// }
