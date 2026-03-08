/**
 * ApartmentGarageHandler.ts — Stub for apartment garage type.
 *
 * TODO: Implement apartment-specific zones and retrieval logic.
 * Potential zones: 'elevator', 'spawn'
 * Potential behaviour: elevator interaction → screen fade → vehicle spawns underground
 */

import { GarageHandler } from '../GarageHandler';

export class ApartmentGarageHandler extends GarageHandler {
  onLoad(): void {
    // TODO: register apartment garage markers and interaction zones
  }

  onUnload(): void {
    // TODO: unregister apartment garage markers and interaction zones
  }
}
