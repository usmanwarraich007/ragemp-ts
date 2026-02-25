/**
 * WorldInteractable.ts — Core interface for the world interaction system.
 * Zero runtime code — pure types only.
 *
 * Feature authors implement this interface and call registry.register().
 */

// ── Menu item ─────────────────────────────────────────────────────────────

export interface InteractableMenuItem {
  /** Text shown in the scrollable menu */
  label: string;
  /** Identifier passed to onSelect() */
  action: string;
}

// ── Main interface ─────────────────────────────────────────────────────────

export interface WorldInteractable {
  /**
   * Globally unique ID.
   * Naming convention:
   *   static:  'atm-beach-01'
   *   entity:  'veh-{remoteId}-door-dside-f'
   *   prop:    'prop-{handle}-door'
   */
  readonly id: string;

  // ── Label (proximity) ──────────────────────────────────────────────────

  /** Primary text shown when player is nearby. */
  label: string;

  /**
   * Optional second line under the label (e.g. address, owner name).
   * @example subtitle: 'Innocence Blvd. 9'
   */
  subtitle?: string;

  /**
   * Distance (m) within which the label is drawn.
   * Use a larger value than interactRadius so the label appears
   * before the player can actually interact.
   */
  labelRadius: number;

  // ── Position source ────────────────────────────────────────────────────

  /**
   * Called every frame while the player is within range.
   * Return null to hide this interactable this frame.
   */
  getPosition(): Vector3 | null;

  // ── Interaction gate ───────────────────────────────────────────────────

  /**
   * Maximum distance (m) within which the ray-snap triggers and the E key
   * works. Defaults to labelRadius when omitted.
   *
   * Typical pattern: labelRadius = 5.0, interactRadius = 1.5
   * → label is visible from 5 m, menu only opens when inside 1.5 m.
   */
  interactRadius?: number;

  /**
   * Optional gate called just before showing the menu.
   * - Return true  → allow interaction normally.
   * - Return false → silently block (no message).
   * - Return string → block and show the string as an error notification.
   *
   * @example canInteract: () => !mp.players.local.vehicle || 'Exit the vehicle first.'
   */
  canInteract?: () => boolean | string;

  // ── Interaction menu ───────────────────────────────────────────────────

  /**
   * Menu header line.
   * - Omit / undefined → defaults to `label`.
   * - Empty string '' → title row hidden (proximity label already shows the name).
   */
  menuTitle?: string;

  /**
   * Items in the scrollable menu.
   * Pass a getter function to support dynamic items (e.g. "Open" ↔ "Close").
   *
   * @example items: () => [{ label: isDoorOpen ? 'Close' : 'Open', action: 'toggle' }]
   */
  items: InteractableMenuItem[] | (() => InteractableMenuItem[]);

  /**
   * Called when the player presses E on a menu item.
   */
  onSelect(action: string): void;

  // ── Ray snap ───────────────────────────────────────────────────────────

  /**
   * Override the ray-to-point snap radius for this interactable.
   * Increase for large props where the player shouldn't need to aim precisely.
   * Default: 0.7 m.
   */
  snapRadius?: number;
}
