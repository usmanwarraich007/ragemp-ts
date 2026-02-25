import type { ServerRPCs, ClientRPCs } from '@ragemp/shared';

// ── Types ──────────────────────────────────────────────────────────────────

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason: string) => void;
  timer: ReturnType<typeof setTimeout>;
};

const RPC_TIMEOUT_MS = 10_000;

// ── State ──────────────────────────────────────────────────────────────────

/**
 * Stores in-flight CEF→Server promises keyed by their unique request ID.
 * Resolved/rejected by the client bridge calling window.rpc.resolve/reject.
 */
const pendingRequests = new Map<string, PendingRequest>();

/**
 * Locally registered handlers for Server→CEF reverse calls.
 * Populated via rpc.register().
 */
const localHandlers = new Map<string, (...args: unknown[]) => unknown>();

// ── window.rpc — called by the Client bridge ───────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).rpc = {

  /** Called by the client when the server resolves a CEF→Server request. */
  resolve(id: string, result: unknown): void {
    const req = pendingRequests.get(id);
    if (!req) return;
    clearTimeout(req.timer);
    req.resolve(result);
    pendingRequests.delete(id);
  },

  /** Called by the client when the server rejects a CEF→Server request. */
  reject(id: string, error: string): void {
    const req = pendingRequests.get(id);
    if (!req) return;
    clearTimeout(req.timer);
    req.reject(error);
    pendingRequests.delete(id);
  },

  /**
   * Called by the client for Server→CEF reverse calls.
   * Runs the registered local handler and sends the result back to the client.
   */
  async triggerCEF(id: string, eventName: string, argsJSON: string): Promise<void> {
    const handler = localHandlers.get(eventName);

    if (!handler) {
      (window as Window & { mp?: { trigger: (...a: unknown[]) => void } }).mp?.trigger(
        'rpc:clientResolve',
        id,
        'null',
        `No CEF handler registered for: ${eventName}`,
      );
      return;
    }

    try {
      const args = JSON.parse(argsJSON) as unknown[];
      const result = await handler(...args);
      // Stringify result so objects survive the CEF→Client trigger boundary
      const resultJSON = JSON.stringify(result ?? null);
      (window as Window & { mp?: { trigger: (...a: unknown[]) => void } }).mp?.trigger(
        'rpc:clientResolve',
        id,
        resultJSON,
      );
    } catch (err) {
      (window as Window & { mp?: { trigger: (...a: unknown[]) => void } }).mp?.trigger(
        'rpc:clientResolve',
        id,
        'null',
        String(err),
      );
    }
  },
};

// ── Public API ─────────────────────────────────────────────────────────────

export const rpc = {
  /**
   * Call a server-side RPC procedure and await its result.
   *
   * @example
   * const balance = await rpc.callServer('getBankBalance');
   */
  callServer<K extends keyof ServerRPCs>(
    eventName: K,
    ...args: Parameters<ServerRPCs[K]>
  ): Promise<ReturnType<ServerRPCs[K]>> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(2, 15);

      const timer = setTimeout(() => {
        pendingRequests.delete(id);
        reject(`[RPC] Timeout: server did not respond to "${String(eventName)}" within ${RPC_TIMEOUT_MS}ms`);
      }, RPC_TIMEOUT_MS);

      pendingRequests.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timer,
      });

      const mp = (window as Window & { mp?: { trigger: (...a: unknown[]) => void } }).mp;
      if (mp) {
        // Pack ALL args as a single JSON string so objects (e.g. appearance) survive
        // the CEF→Client mp.trigger boundary without being coerced to primitives.
        mp.trigger('rpc:request', id, String(eventName), JSON.stringify(args));
      } else {
        // Dev mock — resolve immediately with empty object
        clearTimeout(timer);
        pendingRequests.delete(id);
        console.warn(`[RPC DevMock] callServer("${eventName}")`, args);
        resolve({} as ReturnType<ServerRPCs[K]>);
      }
    });
  },

  /**
   * Register a local CEF handler for Server→CEF reverse calls.
   *
   * @example
   * rpc.register('ui:confirmDialog', (question) => confirm(question));
   */
  register<K extends keyof ClientRPCs>(eventName: K, handler: ClientRPCs[K]): void {
    localHandlers.set(String(eventName), handler as (...args: unknown[]) => unknown);
  },
};
