/**
 * InteractableRegistry.ts — Central singleton for the world interaction system.
 *
 * Single render loop; single raycast per frame.
 * Drives label drawing, subtitle, reticle, interact-radius gate,
 * canInteract condition, and menu bridging.
 */

import type { WorldInteractable, InteractableMenuItem } from './WorldInteractable';
import { raycastFromCamera } from './Raycast';
import { interactionMenu }  from './InteractionMenu';

// ── Constants ───────────────────────────────────────────────────────────────

/** Hard cap on label draw distance. Individual labelRadius cannot exceed this. */
const MAX_LABEL_DIST    = 12.0;

/** Default ray-to-point snap radius when interactable.snapRadius is not set. */
const DEFAULT_SNAP_RADIUS = 0.7;

/** Raycast distance in metres. */
const RAYCAST_DIST      = 15.0;

const COL_LABEL_NORMAL   = [200, 200, 200, 210] as const;
const COL_LABEL_TARGETED = [255, 255,  80, 255] as const;
const COL_SUBTITLE       = [160, 160, 160, 190] as const;
const FONT               = 4;
const SCALE_LABEL        = [0.33, 0.33] as const;
const SCALE_SUBTITLE     = [0.28, 0.28] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve items — supports static array or dynamic getter. */
function resolveItems(
  raw: InteractableMenuItem[] | (() => InteractableMenuItem[]),
): InteractableMenuItem[] {
  return typeof raw === 'function' ? raw() : raw;
}

// ── Registry ─────────────────────────────────────────────────────────────────

class InteractableRegistry {
  private readonly items = new Map<string, WorldInteractable>();
  private targeted: WorldInteractable | null = null;

  constructor() {
    mp.events.add('render', () => this.onRender());
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Add an interactable.
   *
   * @example
   * registry.register({
   *   id:            'atm-beach-01',
   *   label:         'ATM',
   *   subtitle:      'Innocence Blvd.',        // optional second line
   *   labelRadius:   5.0,                      // label shows from 5 m
   *   interactRadius: 1.5,                     // menu only within 1.5 m
   *   canInteract:   () => !mp.players.local.vehicle || 'Exit vehicle first.',
   *   getPosition:   () => new mp.Vector3(x, y, z),
   *   items:         () => [{ label: 'Use ATM', action: 'atm:use' }], // dynamic
   *   snapRadius:    1.2,                      // larger snap for wide marker
   *   onSelect:      (action) => { … },
   * });
   */
  register(item: WorldInteractable): void {
    this.items.set(item.id, item);
  }

  /** Remove a registered interactable. Safe even if id is unknown. */
  unregister(id: string): void {
    this.items.delete(id);
    if (this.targeted?.id === id) {
      this.targeted = null;
      this.syncMenu(null);
    }
  }

  // ── Render loop ─────────────────────────────────────────────────────────────

  private onRender(): void {
    const player = mp.players.local;
    if (!player?.handle || player.vehicle) {
      if (this.targeted) { this.targeted = null; this.syncMenu(null); }
      return;
    }

    const px = player.position.x;
    const py = player.position.y;
    const pz = player.position.z;

    // ── 1. Collect items within labelRadius ────────────────────────────────
    const nearby: Array<{ item: WorldInteractable; pos: Vector3; dist: number }> = [];

    for (const item of this.items.values()) {
      const pos = item.getPosition();
      if (!pos) continue;

      const dist = mp.game.system.vdist(px, py, pz, pos.x, pos.y, pos.z);
      const cap  = Math.min(item.labelRadius, MAX_LABEL_DIST);
      if (dist <= cap) nearby.push({ item, pos, dist });
    }

    // ── 2. Single raycast ──────────────────────────────────────────────────
    const raycast = raycastFromCamera(RAYCAST_DIST);

    // ── 3. Ray-to-point snap (respects per-item snapRadius + interactRadius) 
    let newTargeted: WorldInteractable | null = null;
    let bestSnap = Infinity;

    if (raycast) {
      const hx = raycast.position.x;
      const hy = raycast.position.y;
      const hz = raycast.position.z;

      for (const { item, pos, dist } of nearby) {
        const snapR    = item.snapRadius    ?? DEFAULT_SNAP_RADIUS;
        const interactR = item.interactRadius ?? item.labelRadius;

        // Must be within interact radius AND within snap distance of ray hit
        if (dist > interactR) continue;

        const snapDist = mp.game.system.vdist(hx, hy, hz, pos.x, pos.y, pos.z);
        if (snapDist < snapR && snapDist < bestSnap) {
          bestSnap    = snapDist;
          newTargeted = item;
        }
      }
    }

    // ── 4. Reticle ─────────────────────────────────────────────────────────
    if (newTargeted) mp.game.ui.showHudComponentThisFrame(14);

    // ── 5. Sync menu if target changed ─────────────────────────────────────
    if (newTargeted !== this.targeted) {
      this.targeted = newTargeted;
      this.syncMenu(this.targeted);
    }

    // ── 6. Draw proximity labels ───────────────────────────────────────────
    for (const { item, pos } of nearby) {
      const screen = mp.game.graphics.world3dToScreen2d(pos);
      if (!screen || screen.x <= 0 || screen.y <= 0) continue;

      const isHit = item === this.targeted;
      const col   = isHit ? COL_LABEL_TARGETED : COL_LABEL_NORMAL;

      // Primary label
      mp.game.graphics.drawText(item.label, [screen.x, screen.y - 0.022], {
        font:    FONT,
        color:   [...col] as [number, number, number, number],
        scale:   [...SCALE_LABEL] as [number, number],
        outline: true,
        centre:  true,
      });

      // Subtitle (second line)
      if (item.subtitle) {
        mp.game.graphics.drawText(item.subtitle, [screen.x, screen.y - 0.004], {
          font:    FONT,
          color:   [...COL_SUBTITLE] as [number, number, number, number],
          scale:   [...SCALE_SUBTITLE] as [number, number],
          outline: true,
          centre:  true,
        });
      }
    }
  }

  // ── Menu bridge ────────────────────────────────────────────────────────────

  private syncMenu(item: WorldInteractable | null): void {
    if (!item) { interactionMenu.setActive(null); return; }

    // Check canInteract gate
    if (item.canInteract) {
      const result = item.canInteract();
      if (result !== true) {
        // Blocked — show message if reason string provided
        if (typeof result === 'string') mp.gui.chat.push(`!{FF6644}${result}`);
        interactionMenu.setActive(null);
        return;
      }
    }

    interactionMenu.setActive({
      id:       item.id,
      getTitle: () => item.menuTitle !== undefined ? item.menuTitle : item.label,
      getItems: () => resolveItems(item.items),
      getPos:   () => item.getPosition(),
      onSelect: item.onSelect.bind(item),
    });
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────
export const registry = new InteractableRegistry();
