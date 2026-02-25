/**
 * Raycast.ts — typed camera raycast utility.
 * Ported from raycast-reference.js with full TypeScript types.
 */

export interface RaycastResult {
  entity: EntityMp | number;
  position: Vector3;
  surfaceNormal: Vector3;
  /** -1 if no matching bone found */
  boneIndex: number;
}

/**
 * Fire a ray from the gameplay camera toward its look direction.
 * Ignores the local player so the ray passes through their body.
 *
 * @param distance  Ray length in world units (default: auto-calculated from cam distance)
 */
export function raycastFromCamera(distance?: number): RaycastResult | null {
  const player = mp.players.local;
  if (!player || !player.handle) return null;

  // Dynamic distance: camera-to-player distance + 2 m base interaction range.
  // Close camera (~0-2 m) → ~2-4 m ray. Far camera (~6-8 m) → ~8-10 m ray.
  const effectiveDistance = distance ?? (() => {
    const camPos   = mp.game.cam.getGameplayCoord();
    const plPos    = player.position;
    const camDist  = mp.game.system.vdist(camPos.x, camPos.y, camPos.z, plPos.x, plPos.y, plPos.z);
    return camDist + 2.0;
  })();

  const startPos = mp.game.cam.getGameplayCoord();
  const camRot   = mp.game.cam.getGameplayCamRot(2);
  const rotZ     = camRot.z * (Math.PI / 180);
  const rotX     = camRot.x * (Math.PI / 180);
  const dirX     = -Math.sin(rotZ) * Math.cos(rotX);
  const dirY     =  Math.cos(rotZ) * Math.cos(rotX);
  const dirZ     =  Math.sin(rotX);

  const endPos = new mp.Vector3(
    startPos.x + dirX * effectiveDistance,
    startPos.y + dirY * effectiveDistance,
    startPos.z + dirZ * effectiveDistance,
  );

  // Flags: 1 (world) | 2 (vehicles) | 4 (peds) | 16 (objects)
  const raycast = mp.raycasting.testPointToPoint(startPos, endPos, player, 1 | 2 | 4 | 16);
  if (!raycast || !raycast.entity) return null;

  return {
    entity:        raycast.entity,
    position:      raycast.position,
    surfaceNormal: raycast.surfaceNormal,
    boneIndex:     -1, // callers may resolve bones themselves as needed
  };
}

/**
 * 3-D euclidean distance between two Vector3 values.
 */
export function distVec(a: Vector3, b: Vector3): number {
  return mp.game.system.vdist(a.x, a.y, a.z, b.x, b.y, b.z);
}
