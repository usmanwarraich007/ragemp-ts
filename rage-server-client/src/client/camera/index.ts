/**
 * camera/index.ts — Public API surface for the reusable camera module.
 *
 * Import from '@/client/camera' (or relative '../camera') for any feature.
 */

export { cameraManager }                          from './manager';
export { enableOrbit, disableOrbit, setDragging, setOrbitTarget, snapOrbitTarget, adjustRadius, rotatePolar, setPanelHovered } from './renderLoop';
export type { OrbitConfig }                       from './renderLoop';
export { setLookBone, zoneForTab }                from './boneCamera';
export { charCreatorCamera, stopCreatorCamera }   from './presets';
