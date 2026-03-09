import { browserManager } from '../browser';

/**
 * chat/chat.client.ts — Relay layer between server and CEF for the chat system.
 *
 * Fully suppresses the RAGE:MP native chat. All T-key input goes through
 * our CEF chat. Server events are relayed to the CEF EventBus.
 */

// ── Suppress native RAGE:MP chat immediately ──────────────────────────────

// Hide the native chat box permanently
mp.gui.chat.show(false);

// Disable the T-key from opening the native chat input.
// Without this, T still opens the native box alongside our CEF input
// and slash commands get swallowed by the native playerChat/playerCommand path.
mp.gui.chat.activate(false);

// ── Message relay ──────────────────────────────────────────────────────────

/**
 * Server → Client → CEF: a new chat message arrived.
 * The payload is JSON-serialised on the server so it survives the call boundary.
 */
mp.events.add('chat:message', (msgJson: string) => {
  try {
    const msg = JSON.parse(msgJson);
    browserManager.emit('chat', 'message', msg);
  } catch {
    // Malformed payload — ignore silently
  }
});

// ── Focus relay ────────────────────────────────────────────────────────────

mp.events.add('chat:focus', (active: boolean) => {
  browserManager.emit('chat', 'focus', active);
});

// ── T key binding ──────────────────────────────────────────────────────────

/**
 * T (0x54) — open the CEF chat input.
 * Guard: do nothing if a full-screen page (auth, inventory, etc.) is open.
 */
mp.keys.bind(0x54, true, () => {
  if (browserManager.isPageOpen()) return;
  mp.gui.cursor.show(true, true);           // show cursor while typing
  browserManager.emit('chat', 'focus', true);
});

/**
 * CEF fires 'chat:blur' (via window.mp.trigger) when the player closes
 * the chat input (Enter sent or Escape pressed).
 */
mp.events.add('chat:blur', () => {
  mp.gui.cursor.show(false, false);
});

