/**
 * interaction — barrel export.
 * Feature scripts import from here; never import sub-files directly.
 *
 * @example
 * import { registry, markerSystem } from '../interaction';
 */

// Core registry
export { registry }                                          from './InteractableRegistry';
export type { WorldInteractable, InteractableMenuItem }      from './WorldInteractable';

// Marker system (separate from registry — purely visual)
export { markerSystem }                                      from './MarkerSystem';
export type { WorldMarker }                                  from './MarkerSystem';

// Menu engine (consumed by registry internally)
export { interactionMenu }                                   from './InteractionMenu';

// Raycast utility
export { raycastFromCamera, distVec }                        from './Raycast';
export type { RaycastResult }                                from './Raycast';
