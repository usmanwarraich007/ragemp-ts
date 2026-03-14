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

/** Default reticle limit when interactable.reticleLimit is not set. */
const DEFAULT_RETICLE_LIMIT = 0.7;

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
  /** Cached result of the last canInteract() call — used to detect changes. */
  private lastCanInteract: boolean | string = true;

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
   *   reticleLimit:  0.4,
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

  /**
   * Force the currently targeted item to re-run canInteract() and re-sync
   * the menu immediately — without waiting for the target to change.
   * Call this when a variable that affects canInteract() changes externally
   * (e.g. vehicle locked state toggled while the player is looking at a door).
   */
  invalidate(): void {
    this.syncMenu(this.targeted);
  }

  // ── Render loop ─────────────────────────────────────────────────────────────

  private onRender(): void {
    const player = mp.players.local;
    if (!player?.handle || player.vehicle) {
      if (this.targeted) { this.targeted = null; this.syncMenu(null); }
      return;
    }

    const startPos = mp.game.cam.getGameplayCoord();
    const camRot = mp.game.cam.getGameplayCamRot(2);
    
    // 1. Calculate Camera Direction Vector
    const rotZ = camRot.z * (Math.PI / 180);
    const rotX = camRot.x * (Math.PI / 180);
    const dir = new mp.Vector3(
      -Math.sin(rotZ) * Math.cos(rotX),
      Math.cos(rotZ) * Math.cos(rotX),
      Math.sin(rotX)
    );

    // 2. Filter nearby items (basic distance check from player)
    const nearby: Array<{ item: WorldInteractable; pos: Vector3; dist: number }> = [];
    for (const item of this.items.values()) {
      const pos = item.getPosition();
      if (!pos) continue;

      const dist = mp.game.system.vdist(player.position.x, player.position.y, player.position.z, pos.x, pos.y, pos.z);
      const cap = Math.min(item.labelRadius, MAX_LABEL_DIST);
      if (dist <= cap) nearby.push({ item, pos, dist });
    }

    // 3. Sphere Cast Logic: Find item closest to the "Look Line"
    let newTargeted: WorldInteractable | null = null;
    let showReticle = false;
    let bestSnap = Infinity;

    for (const { item, pos, dist } of nearby) {
      const interactR = item.interactRadius ?? item.labelRadius;
      if (dist > interactR) continue;

      // Vector from camera to the object
      const vecToObject = new mp.Vector3(pos.x - startPos.x, pos.y - startPos.y, pos.z - startPos.z);
      
      // Calculate Projection (how far along the look-vector the object is)
      const dot = (vecToObject.x * dir.x) + (vecToObject.y * dir.y) + (vecToObject.z * dir.z);
      
      // If dot < 0, the object is behind the camera
      if (dot < 0 || dot > RAYCAST_DIST) continue;

      // Find the perpendicular distance from the line to the point
      // formula: dist = ||vecToObject - (projection_vec)||
      const projX = startPos.x + dir.x * dot;
      const projY = startPos.y + dir.y * dot;
      const projZ = startPos.z + dir.z * dot;

      const snapDist = mp.game.system.vdist(pos.x, pos.y, pos.z, projX, projY, projZ);
      const snapLimit = item.snapRadius ?? DEFAULT_SNAP_RADIUS;
      const reticleLimit = item.reticleLimit ?? DEFAULT_RETICLE_LIMIT;

      if (snapDist < reticleLimit) {
        showReticle = true;
      }

      if (snapDist < snapLimit && snapDist < bestSnap) {
        bestSnap = snapDist;
        newTargeted = item;
      }
    }

    // ── 4. Reticle & Menu Sync ─────────────────────────────────────────────
    if (showReticle) mp.game.ui.showHudComponentThisFrame(14);

    if (newTargeted !== this.targeted) {
      this.targeted = newTargeted;
      this.syncMenu(this.targeted);
    } else if (newTargeted?.canInteract) {
      const result = newTargeted.canInteract();
      if (result !== this.lastCanInteract) {
        this.syncMenu(this.targeted);
      }
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
    if (!item) {
      this.lastCanInteract = true;
      interactionMenu.setActive(null);
      return;
    }

    // Check canInteract gate and cache the result
    if (item.canInteract) {
      const result = item.canInteract();
      this.lastCanInteract = result;
      if (result !== true) {
        // Blocked — show message if reason string provided
        if (typeof result === 'string') mp.gui.chat.push(`!{FF6644}${result}`);
        interactionMenu.setActive(null);
        return;
      }
    } else {
      this.lastCanInteract = true;
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
