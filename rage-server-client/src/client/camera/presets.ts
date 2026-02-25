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

// ── Character Creator ─────────────────────────────────────────────────────────

/**
 * Activate the character creator orbit camera.
 *
 * @param entity  The player/ped to orbit around (local player for char creator).
 * @param heading  Initial GTA world heading of the entity (0 = North). Used to
 *                 place the camera in front of them. Defaults to entity's current heading.
 */
export function charCreatorCamera(entity: PlayerMp): void {
  const heading = (entity as any).getHeading?.() ?? (entity.heading ?? 0);

  // Polar angle: heading + 90 puts camera in the direction the player faces.
  // GTA heading 0 = +Y (north). Polar 90 = camera at +Y offset → sees face.
  const initialPolar = (heading + 90 + 360) % 360;

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
