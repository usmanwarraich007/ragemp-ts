/**
 * InteractableRegistry.ts — Central singleton for the world interaction system.
 *
 * Responsibilities (all in ONE render loop, shared resources):
 *   1. Single raycast per frame (cached result reused by all subsystems)
 *   2. Proximity label drawing for all registered WorldInteractables
 *   3. Reticle (HUD component 14) when a point is aimed at
 *   4. Bridges the targeted interactable to InteractionMenu
 *
 * Feature authors never touch rendering or input — they only call:
 *   registry.register(interactable)
 *   registry.unregister(id)
 */

import type { WorldInteractable } from './WorldInteractable';
import { raycastFromCamera } from './Raycast';
import { interactionMenu } from './InteractionMenu';

// ── Visual constants ────────────────────────────────────────────────────────

/** Maximum distance (m) to bother drawing any label */
const MAX_LABEL_DIST   = 8.0;

/** Maximum ray-snap distance (m) from ray hit to interactable position */
const SNAP_RADIUS      = 0.7;

/** Raycast range (m) — dynamic adds camera offset at runtime */
const BASE_RAYCAST_DIST = 15.0;

const COL_LABEL_NORMAL   = [200, 200, 200, 210] as const;
const COL_LABEL_TARGETED = [255, 255,  80, 255] as const;
const FONT               = 4;
const SCALE_LABEL        = [0.33, 0.33] as const;
const SCALE_HINT         = [0.38, 0.38] as const;

// ── Registry ────────────────────────────────────────────────────────────────

class InteractableRegistry {
  private readonly items = new Map<string, WorldInteractable>();

  /** The interactable the player is currently aiming at (null = none) */
  private targeted: WorldInteractable | null = null;

  constructor() {
    mp.events.add('render', () => this.onRender());
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Add an interactable to the world.
   *
   * @example
   * registry.register({
   *   id: 'atm-beach-01',
   *   label: 'ATM',
   *   labelRadius: 2.5,
   *   getPosition: () => new mp.Vector3(123, 456, 20),
   *   items: [{ label: 'Use', action: 'atm:use' }],
   *   onSelect: (action) => { … },
   * });
   */
  register(item: WorldInteractable): void {
    this.items.set(item.id, item);
  }

  /**
   * Remove a previously registered interactable.
   * Safe to call even if the ID was never registered.
   */
  unregister(id: string): void {
    this.items.delete(id);
    if (this.targeted?.id === id) {
      this.targeted = null;
      this.syncMenu(null);
    }
  }

  // ── Render loop ───────────────────────────────────────────────────────────

  private onRender(): void {
    const player = mp.players.local;
    if (!player?.handle || player.vehicle) {
      // Inside a vehicle — hide everything
      if (this.targeted) {
        this.targeted = null;
        this.syncMenu(null);
      }
      return;
    }

    const playerPos = player.position;

    // ── 1. Collect interactables within label range ──────────────────────
    //   Pre-filter before expensive position computations.
    //   We use the interactable's last known position as the range anchor
    //   (stored lazily in the closure below).

    const nearby: Array<{ item: WorldInteractable; pos: Vector3 }> = [];

    for (const item of this.items.values()) {
      const pos = item.getPosition();
      if (!pos) continue;

      const dist = mp.game.system.vdist(
        playerPos.x, playerPos.y, playerPos.z,
        pos.x,       pos.y,       pos.z,
      );

      if (dist <= Math.min(item.labelRadius, MAX_LABEL_DIST)) {
        nearby.push({ item, pos });
      }
    }

    // ── 2. Single raycast (shared resource) ──────────────────────────────
    const raycast = raycastFromCamera(BASE_RAYCAST_DIST);

    // ── 3. Snap ray hit to closest interactable ───────────────────────────
    let newTargeted: WorldInteractable | null = null;
    let bestSnap = SNAP_RADIUS;

    if (raycast) {
      const hit = raycast.position;
      for (const { item, pos } of nearby) {
        const d = mp.game.system.vdist(hit.x, hit.y, hit.z, pos.x, pos.y, pos.z);
        if (d < bestSnap) {
          bestSnap    = d;
          newTargeted = item;
        }
      }
    }

    // ── 4. Reticle ────────────────────────────────────────────────────────
    if (newTargeted) {
      mp.game.ui.showHudComponentThisFrame(14); // HUD_RETICLE
    }

    // ── 5. Sync to InteractionMenu if target changed ──────────────────────
    if (newTargeted !== this.targeted) {
      this.targeted = newTargeted;
      this.syncMenu(this.targeted);
    }

    // ── 6. Draw proximity labels ──────────────────────────────────────────
    for (const { item, pos } of nearby) {
      const screen = mp.game.graphics.world3dToScreen2d(pos);
      if (!screen || screen.x <= 0 || screen.y <= 0) continue; // off-screen — skip

      const isHit = item === this.targeted;
      const color = isHit ? COL_LABEL_TARGETED : COL_LABEL_NORMAL;

      mp.game.graphics.drawText(item.label, [screen.x, screen.y - 0.022], {
        font:    FONT,
        color:   [...color] as [number, number, number, number],
        scale:   [...SCALE_LABEL] as [number, number],
        outline: true,
        centre:  true,
      });
    }
  }

  // ── InteractionMenu bridge ────────────────────────────────────────────────

  /**
   * Push the currently targeted interactable into InteractionMenu
   * so it can render its scrollable menu and handle E-key input.
   */
  private syncMenu(item: WorldInteractable | null): void {
    if (!item) {
      interactionMenu.setActive(null);
      return;
    }
    interactionMenu.setActive({
      id:       item.id,
      getTitle: () => item.menuTitle ?? item.label,
      items:    item.items,
      getPos:   () => item.getPosition(),
      onSelect: item.onSelect.bind(item),
    });
  }
}

// ── Singleton export ─────────────────────────────────────────────────────────
export const registry = new InteractableRegistry();
