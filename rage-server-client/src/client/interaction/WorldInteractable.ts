/**
 * WorldInteractable.ts — Core interface for the world interaction system.
 *
 * This file is pure types — zero runtime code.
 * Every feature that wants to show a label / menu in the world implements
 * this interface and registers it with InteractableRegistry.
 *
 * Examples:
 *   Vehicle door    → position from bone, registered on entityStreamIn
 *   Static ATM      → fixed Vector3, registered at startup
 *   Prop door       → bone position from object handle
 *   NPC             → ped.position updated each frame
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
   * Used for selection-state persistence (scroll position survives look-away).
   *
   * Naming convention:
   *   static:  'atm-beach-01'
   *   entity:  'veh-{remoteId}-door-dside-f'
   *   prop:    'prop-{handle}-door'
   */
  readonly id: string;

  // ── Label (proximity) ──────────────────────────────────────────────────

  /** Text rendered above the interactable point when the player is nearby. */
  label: string;

  /**
   * Maximum distance (metres) at which the label is visible.
   * Recommended defaults:
   *   Tight interaction  → 2.0 m  (door handle, ATM button)
   *   Medium             → 3.0 m  (vehicle door, NPC)
   *   Broad              → 5.0 m  (shop entrance marker)
   */
  labelRadius: number;

  // ── Position source ────────────────────────────────────────────────────

  /**
   * Called once per frame by InteractableRegistry (only while the player is
   * within range of the last known position).
   *
   * Return null to hide this interactable for the current frame.
   * The registry uses the last non-null result as its range pre-filter anchor.
   */
  getPosition(): Vector3 | null;

  // ── Interaction menu ───────────────────────────────────────────────────

  /**
   * Menu header line. Defaults to `label` when omitted.
   * May be mutated each frame to reflect live state, e.g. "[OPEN]" / "[CLOSED]".
   */
  menuTitle?: string;

  /** Actions in the scrollable menu. */
  items: InteractableMenuItem[];

  /**
   * Called when the player presses E on a menu item.
   * @param action — the item's action string
   */
  onSelect(action: string): void;
}
