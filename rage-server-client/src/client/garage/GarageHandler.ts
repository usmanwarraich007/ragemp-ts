/**
 * GarageHandler.ts — Abstract base class for all garage type plugins.
 *
 * Each garage type (PublicGarage, ApartmentGarage, HouseGarage…) extends
 * this class and implements onLoad() / onUnload(). The GarageManager calls
 * these on garage:sync, garage:add, and garage:remove events.
 *
 * Convention:
 *   - Every registry / markerSystem ID must be prefixed with `${this.data.id}-`
 *   - Every register() in onLoad() must have matching unregister() in onUnload()
 */

import type { GarageDto } from '@ragemp/shared';

export abstract class GarageHandler {
  constructor(protected data: GarageDto) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  abstract onLoad(): void;
  abstract onUnload(): void;

  /**
   * Called when garage:update is received for this id.
   * Returns true if a full onUnload/onLoad cycle was triggered (position or zone change).
   */
  onUpdate(patch: Partial<GarageDto>): boolean {
    const needsReload = (
      ('x' in patch && patch.x !== this.data.x) ||
      ('y' in patch && patch.y !== this.data.y) ||
      ('z' in patch && patch.z !== this.data.z) ||
      ('zones' in patch && patch.zones !== undefined)
    );

    Object.assign(this.data, patch);

    if (needsReload) {
      this.onUnload();
      this.onLoad();
    }

    return needsReload;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Shorthand: `${this.data.id}-${suffix}` */
  protected zoneId(suffix: string): string {
    return `${this.data.id}-${suffix}`;
  }

  /** Anchor position of the garage. */
  protected get pos(): Vector3 {
    return new mp.Vector3(this.data.x, this.data.y, this.data.z);
  }

  /**
   * Read zone position from DB data, or fall back to anchor + offset.
   * Each subclass calls zoneVec() by its own zone key names.
   */
  protected zoneVec(key: string, dx = 0, dy = 0, dz = 0): Vector3 {
    const z = this.data.zones?.[key];
    return z
      ? new mp.Vector3(z.x, z.y, z.z)
      : new mp.Vector3(this.data.x + dx, this.data.y + dy, this.data.z + dz);
  }
}
