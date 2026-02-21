import type { CefEventMap } from '@ragemp/shared';

type EventHandler<T = unknown> = (payload: T) => void;

/**
 * Typed in-memory pub/sub bus.
 * Completely framework-agnostic — no Vue, React, or Svelte imports.
 */
class EventBus {
  private handlers = new Map<string, EventHandler>();

  /**
   * Register a typed handler for a CEF event.
   * @example bus.on('hud:setVehicleData', (data) => { ... })
   */
  on<K extends keyof CefEventMap>(event: K, handler: EventHandler<CefEventMap[K]>): void {
    this.handlers.set(event as string, handler as EventHandler);
  }

  /** Remove the handler for the given event. */
  off<K extends keyof CefEventMap>(event: K): void {
    this.handlers.delete(event as string);
  }

  /** Dispatch an event to its registered handler. */
  emit<K extends keyof CefEventMap>(event: K, payload: CefEventMap[K]): void {
    const handler = this.handlers.get(event as string);
    if (handler) {
      handler(payload);
    } else if (import.meta.env.DEV) {
      console.warn(`[EventBus] No handler registered for event: ${String(event)}`);
    }
  }

  /** Remove all registered handlers. */
  clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();
