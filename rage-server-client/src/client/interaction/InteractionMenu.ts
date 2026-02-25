/**
 * InteractionMenu.ts — Scrollable world-anchored native menu engine.
 *
 * Driven by InteractableRegistry via setActive().
 * Feature code never imports this directly — use the registry.
 *
 * Public surface:
 *   interactionMenu.setActive(slot | null)
 */

// ── Active slot type (set by registry) ─────────────────────────────────────

export interface ActiveMenuSlot {
  /** Must match the originating WorldInteractable.id for selection persistence */
  id:       string;
  getTitle: () => string;
  items:    { label: string; action: string }[];
  /** World-space anchor (null = hide menu this frame) */
  getPos:   () => Vector3 | null;
  onSelect: (action: string) => void;
}

// ── Visual constants ────────────────────────────────────────────────────────

const ROW_STEP       = 0.022;   // vertical gap between items
const ITEM_START_Y   = 0.005;   // offset from anchor to first item — keep small when no title
const TITLE_OFFSET_Y = -0.01;

const COL_TITLE    = [255, 255, 255, 255] as const;
const COL_NORMAL   = [190, 190, 190, 220] as const;
const COL_SELECTED = [255, 220,  60, 255] as const;  // gold — matches reference


const SCALE_TITLE  = [0.38, 0.38] as const;
const SCALE_ITEM   = [0.34, 0.34] as const;

const FONT         = 4;
const KEY_E        = 0x45;
const BADGE_OFFSET = 0.038;  // unused — kept in case badge-style is restored

/**
 * GTA V control IDs suppressed while the menu is visible.
 * disableControlAction() is single-frame — called inside the render loop.
 *
 * 14 = INPUT_SELECT_NEXT_WEAPON  (scroll up)
 * 15 = INPUT_SELECT_PREV_WEAPON  (scroll down)
 * 37 = INPUT_SELECT_WEAPON       (weapon wheel hold)
 */
const BLOCKED_CONTROLS = [14, 15, 37] as const;

// ── Engine ──────────────────────────────────────────────────────────────────

class InteractionMenu {
  /** Currently active slot (pushed by registry) */
  private slot: ActiveMenuSlot | null = null;

  /**
   * Per-id persisted scroll position.
   * Survives the player looking away and back at the same interactable.
   */
  private readonly selectionState = new Map<string, number>();

  // ── Getters / setters backed by selectionState ───────────────────────────

  private get selectedIndex(): number {
    return this.slot ? (this.selectionState.get(this.slot.id) ?? 0) : 0;
  }

  private set selectedIndex(v: number) {
    if (this.slot) this.selectionState.set(this.slot.id, v);
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  constructor() {
    mp.events.add('render', () => this.onRender());
    mp.keys.bind(KEY_E, true, () => this.onInteract());
  }

  // ── Registry API ─────────────────────────────────────────────────────────

  /**
   * Called by InteractableRegistry every frame to set the active interactable.
   * Pass null to hide the menu.
   */
  setActive(slot: ActiveMenuSlot | null): void {
    // Clamp selection if new slot has fewer items
    if (slot && slot.id !== this.slot?.id) {
      const saved = this.selectionState.get(slot.id) ?? 0;
      const clamped = Math.min(saved, Math.max(0, slot.items.length - 1));
      this.selectionState.set(slot.id, clamped);
    }
    this.slot = slot;
  }

  // ── Render loop ──────────────────────────────────────────────────────────

  private onRender(): void {
    if (!this.slot) return;

    const pos = this.slot.getPos();
    if (!pos) return;

    // ── Suppress weapon wheel + read scroll ────────────────────────────────
    // Disable first, then read with isDisabledControlJustPressed.
    for (const ctrl of BLOCKED_CONTROLS) {
      mp.game.controls.disableControlAction(0, ctrl, true);
    }
    if (mp.game.controls.isDisabledControlJustPressed(0, 14)) this.scroll(1);
    if (mp.game.controls.isDisabledControlJustPressed(0, 15)) this.scroll(-1);

    // ── Project anchor to screen ───────────────────────────────────────────
    const screen = mp.game.graphics.world3dToScreen2d(pos);
    if (!screen || screen.x <= 0 || screen.y <= 0) return; // off-screen

    this.draw(screen.x, screen.y);
  }

  // ── Drawing ───────────────────────────────────────────────────────────────

  private draw(sx: number, sy: number): void {
    if (!this.slot) return;

    // Title — skip if empty (feature uses registry proximity label instead)
    const title = this.slot.getTitle();
    if (title) {
      mp.game.graphics.drawText(title, [sx, sy + TITLE_OFFSET_Y], {
        font:    FONT,
        color:   [...COL_TITLE] as [number, number, number, number],
        scale:   [...SCALE_TITLE] as [number, number],
        outline: true,
        centre:  true,
      });
    }

    // Items
    const items = this.slot.items;
    for (let i = 0; i < items.length; i++) {
      const rowY      = sy + ITEM_START_Y + ROW_STEP * i;
      const isSelected = i === this.selectedIndex;

      // Selected item — show "[E] label" as one gold line
      const displayLabel = isSelected ? `[E] ${items[i].label}` : items[i].label;

      mp.game.graphics.drawText(displayLabel, [sx, rowY], {
        font:    FONT,
        color:   isSelected
          ? ([...COL_SELECTED] as [number, number, number, number])
          : ([...COL_NORMAL]   as [number, number, number, number]),
        scale:   [...SCALE_ITEM] as [number, number],
        outline: true,
        centre:  true,
      });
    }
  }

  // ── Input handlers ────────────────────────────────────────────────────────

  private scroll(dir: 1 | -1): void {
    if (!this.slot) return;
    const count = this.slot.items.length;
    if (count === 0) return;
    this.selectedIndex = (this.selectedIndex + dir + count) % count;
  }

  private onInteract(): void {
    if (!this.slot) return;
    const item = this.slot.items[this.selectedIndex];
    if (!item) return;
    this.slot.onSelect(item.action);
  }
}

// ── Singleton export ─────────────────────────────────────────────────────────
export const interactionMenu = new InteractionMenu();
