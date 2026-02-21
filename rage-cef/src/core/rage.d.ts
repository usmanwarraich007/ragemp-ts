/**
 * Global type augmentations for window.mp and window.callHandler.
 * These are provided by RAGE:MP at runtime and mocked in dev mode.
 */

interface RageMpEvents {
  add(event: string, handler: (...args: unknown[]) => void): void;
  addProc(event: string, handler: (...args: unknown[]) => Promise<unknown>): void;
}

interface RageMp {
  trigger(event: string, ...args: unknown[]): void;
  events: RageMpEvents;
}

declare global {
  interface Window {
    /** RAGE:MP browser API — available at runtime, mocked in dev. */
    mp: RageMp;
    /** Direct CEF call entry point — used by browser.execute() from client script. */
    callHandler(event: string, ...args: unknown[]): void;
  }
}

export {};
