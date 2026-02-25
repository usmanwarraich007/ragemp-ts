/**
 * interaction — barrel export.
 * Feature scripts import from here; never import sub-files directly.
 *
 * @example
 * import { registry } from '../interaction';
 * registry.register({ id: 'my-thing', … });
 */

// Core registry (the main API for feature authors)
export { registry }                               from './InteractableRegistry';
export type { WorldInteractable, InteractableMenuItem } from './WorldInteractable';

// Menu engine (only needed by InteractableRegistry internally)
export { interactionMenu }                        from './InteractionMenu';

// Raycast utility (used by registry and vehicle features)
export { raycastFromCamera, distVec }             from './Raycast';
export type { RaycastResult }                     from './Raycast';
