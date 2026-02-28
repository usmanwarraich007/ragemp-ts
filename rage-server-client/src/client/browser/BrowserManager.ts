/**
 * BrowserManager — client-side RAGE:MP CEF browser lifecycle manager.
 *
 * Manages a single CEF browser instance and provides:
 *  - show/hide with cursor and control management
 *  - typed event emission to the CEF app
 *  - event queue: events emitted before the DOM is ready are buffered
 *    and flushed automatically when browserDomReady fires.
 */
class BrowserManager {
  private browser: BrowserMp | null = null;
  private domReady = false;
  private queue: Array<{ event: string; jsonPayload: string }> = [];
  /** True when the cursor was force-enabled via F2 (independent of page state). */
  private cursorForced = false;

  constructor() {
    // Flush the queue as soon as the CEF page finishes loading
    mp.events.add('browserDomReady', (browser: BrowserMp) => {
      if (browser !== this.browser) return;
      this.domReady = true;
      for (const { event, jsonPayload } of this.queue) {
        this.execute(event, jsonPayload);
      }
      this.queue = [];
    });

    // F2 — emergency cursor toggle.
    // Useful when a page opens but cursor gets stuck, or to interact with CEF
    // elements without going through a full page show/hide cycle.
    mp.keys.bind(113, true, () => {
      this.cursorForced = !this.cursorForced;
      mp.gui.cursor.show(this.cursorForced, this.cursorForced);
    });
  }

  /** Create and attach the single CEF browser. Call once on player ready. */
  create(url: string): void {
    if (this.browser) return;
    this.domReady = false;
    this.queue = [];
    this.browser = mp.browsers.new(url);
  }

  /** Destroy the browser and release the reference. */
  destroy(): void {
    if (!this.browser) return;
    this.browser.destroy();
    this.browser = null;
    this.domReady = false;
    this.queue = [];
  }

  /**
   * Show the CEF overlay and navigate to a page.
   * Also enables the cursor and disables conflicting game controls.
   */
  show(page: string, data?: unknown, suppressHud = true): void {
    if (!this.browser) return;
    this.emit('system', 'setPage', { page, data, suppressHud });
    mp.gui.cursor.show(true, true);
  }

  /**
   * Hide the CEF overlay and return input control to the game.
   */
  hide(): void {
    if (!this.browser) return;
    this.emit('system', 'setPage', { page: null });
    mp.gui.cursor.show(false, false);
  }

  /**
   * Send a typed event to the CEF app.
   * If the DOM isn't ready yet the call is queued and replayed on browserDomReady.
   */
  emit(target: string, name: string, payload?: unknown): void {
    if (!this.browser) {
      mp.console.logWarning('[BrowserManager] Cannot emit ' + target + ':' + name + ' — browser not created.');
      return;
    }

    const event = `${target}:${name}`;
    const jsonPayload = JSON.stringify(payload ?? null);

    if (!this.domReady) {
      // Buffer the call until callHandler is available in the CEF page
      this.queue.push({ event, jsonPayload });
      return;
    }

    this.execute(event, jsonPayload);
  }

  private execute(event: string, jsonPayload: string): void {
    this.browser?.execute(`window.callHandler(${JSON.stringify(event)}, ${jsonPayload})`);
  }

  /**
   * Execute arbitrary JS in the browser — used by RpcBridge for window.rpc calls.
   * Bypasses the callHandler protocol intentionally.
   */
  executeRaw(js: string): void {
    this.browser?.execute(js);
  }
}

export const browserManager = new BrowserManager();
