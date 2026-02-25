/**
 * camera/boneCamera.ts — Bone-aware look-target management.
 *
 * Maps semantic zone names ('hat', 'top', 'legs', 'shoes') to GTA V bone IDs
 * and configures the orbital camera to focus on that body part.
 *
 * Bone IDs (FreeMode ped, same as reference project):
 *   12844  = SKEL_Head      (head / hat zone)
 *   11816  = SKEL_Spine2    (upper body / tops zone)
 *   65245  = SKEL_L_Foot    (foot / shoes zone)
 */

import { enableOrbit, snapOrbitTarget, setOrbitTarget } from './renderLoop';

// ── Bone configuration ────────────────────────────────────────────────────────

type BoneName = 'face' | 'hat' | 'top' | 'legs' | 'shoes';

interface BoneConfig {
  boneId:      number;
  offset:      { x: number; y: number; z: number };
  azimuthMin:  number;
  azimuthMax:  number;
  radius:      number;
  radiusMin:   number;
  radiusMax:   number;
}

const BONE_CONFIG: Record<BoneName, BoneConfig> = {
  // Face tab — zoomed in close on head
  face: {
    boneId: 12844,
    offset: { x: 0, y: 0, z: 0 },
    azimuthMin: 80, azimuthMax: 110,
    radius: -0.85, radiusMin: -1.5, radiusMax: -0.4,
  },
  // Body tab — wider shot showing upper torso
  hat: {
    boneId: 12844,
    offset: { x: 0,     y: 0,    z: 0   },
    azimuthMin: 80, azimuthMax: 160,
    radius: -1.5,   radiusMin: -3.0, radiusMax: -0.5,
  },
  top: {
    boneId: 11816,
    offset: { x: -0.13, y: 0.13, z: 0   },
    azimuthMin: 80, azimuthMax: 160,
    radius: -1.5,   radiusMin: -3.0, radiusMax: -0.5,
  },
  legs: {
    boneId: 11816,
    offset: { x: 0.5,   y: 0.05, z: 0   },
    azimuthMin: 80, azimuthMax: 120,
    radius: -1.2,   radiusMin: -2.5, radiusMax: -0.8,
  },
  shoes: {
    boneId: 65245,
    offset: { x: -0.168, y: 0,   z: 0.1 },
    azimuthMin: 100, azimuthMax: 130,
    radius: -0.8,   radiusMin: -1.5, radiusMax: -0.5,
  },
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Switch the orbital camera to focus on a body-zone bone.
 * The camera will smoothly lerp to the new look-target.
 *
 * @param entity  The ped/player to read bone coordinates from.
 * @param bone    Zone name: 'hat' | 'top' | 'legs' | 'shoes'
 * @param snap    If true, jump immediately (no lerp) — use on first setup.
 */
export function setLookBone(
  entity: PedMp | PlayerMp,
  bone: BoneName,
  snap = false,
): void {
  const cfg = BONE_CONFIG[bone];
  if (!cfg) return;

  const coords = (entity as any).getBoneCoords(
    cfg.boneId,
    cfg.offset.x,
    cfg.offset.y,
    cfg.offset.z,
  ) as mp.Vector3;

  if (snap) {
    snapOrbitTarget(coords);
  } else {
    setOrbitTarget(coords);
  }

  // Update azimuth/radius limits for this zone
  enableOrbit({
    azimuthMin: cfg.azimuthMin,
    azimuthMax: cfg.azimuthMax,
    radius:     cfg.radius,
    radiusMin:  cfg.radiusMin,
    radiusMax:  cfg.radiusMax,
  });
}

/**
 * Map a clothing/panel category to the most appropriate bone zone.
 * Used when the user switches tabs in the character creator.
 */
export function zoneForTab(tab: string): BoneName {
  switch (tab) {
    case 'face':     return 'face';     // zoom in on head
    case 'clothing': return 'top';      // upper torso
    case 'body':     return 'hat';      // wider head/torso view
    default:         return 'face';
  }
}
