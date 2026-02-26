/**
 * BusinessHandler.ts — Abstract base class for all business type plugins.
 *
 * Each business type (Dealership, Store247, Clothing…) extends this class
 * and implements onLoad() / onUnload(). The core system calls these on
 * business:sync, business:add, and business:remove events.
 *
 * Convention:
 *   - Every registry / markerSystem ID must be prefixed with `${this.data.id}-`
 *   - Every register() in onLoad() must have an unregister() in onUnload()
 *   - Call this.isOwner() to check if local character owns the business
 */

import type { BusinessDto } from '@ragemp/shared';
import { getCharacterId } from '../session';

export abstract class BusinessHandler {
  constructor(protected data: BusinessDto) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /** Register all markers, zones, props for this business. */
  abstract onLoad(): void;

  /** Remove all markers, zones, props. Mirror every register() call. */
  abstract onUnload(): void;

  /**
   * Called when the server broadcasts a business:update for this id.
   * Returns true if a full onUnload/onLoad cycle was triggered (position or zone change).
   * Subclasses should call super.onUpdate(patch) and check the return value.
   */
  onUpdate(patch: Partial<BusinessDto>): boolean {
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

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Returns true if the locally logged-in character owns this business. */
  protected isOwner(): boolean {
    const charId = getCharacterId();
    return charId !== null && this.data.ownerId === charId;
  }

  /** Shorthand: `${this.data.id}-${suffix}` */
  protected zoneId(suffix: string): string {
    return `${this.data.id}-${suffix}`;
  }

  /** Anchor position of the business. */
  protected get pos(): Vector3 {
    return new mp.Vector3(this.data.x, this.data.y, this.data.z);
  }

  /** Offset the anchor by a relative vector. */
  protected offset(dx: number, dy: number, dz = 0): Vector3 {
    return new mp.Vector3(this.data.x + dx, this.data.y + dy, this.data.z + dz);
  }
}
