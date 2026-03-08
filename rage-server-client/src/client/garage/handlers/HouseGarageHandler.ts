/**
 * HouseGarageHandler.ts — Stub for house garage type.
 *
 * TODO: Implement house-specific zones and retrieval logic.
 * Potential zones: 'door', 'spawn'
 * Potential behaviour: door marker → garage door animation → vehicle spawns inside driveway
 */

import { GarageHandler } from '../GarageHandler';

export class HouseGarageHandler extends GarageHandler {
  onLoad(): void {
    // TODO: register house garage markers and interaction zones
  }

  onUnload(): void {
    // TODO: unregister house garage markers and interaction zones
  }
}
