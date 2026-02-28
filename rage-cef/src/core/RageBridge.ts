import type { CefEventMap } from '@ragemp/shared';
import { eventBus } from './EventBus';

const CEF_RPC_TIMEOUT_MS = 10_000;

type PendingRpc = {
  resolve: (value: unknown) => void;
  reject:  (reason: string) => void;
  timer:   ReturnType<typeof setTimeout>;
};


/**
 * Safely parse a JSON string, falling back to the raw value.
 */
function tryParseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * RageBridge handles all RAGE:MP ↔ CEF communication.
 *
 * Inbound  (game → CEF):
 *   - mp.events.add("cef::event", ...) — primary channel from client script
 *   - window.callHandler(...)          — direct browser.execute() fallback
 *
 * Outbound (CEF → game):
 *   - toClient(target, name, payload)  — triggers client-side event handler
 *   - toServer(target, name, payload)  — tunnels through client to server
 */
class RageBridge {
  /** Pending CEF→client RPC calls keyed by correlation ID. */
  private readonly _pendingRpc = new Map<string, PendingRpc>();

  /** Call once at app startup, before mounting Vue. */
  init(): void {
    this.setupDevMock();
    this.setupInbound();
    // Expose resolve/reject hooks so client-side JS can settle pending RPCs
    (window as any)._rageRpc = {
      resolve: (id: string, resultJSON: string) => {
        const pending = this._pendingRpc.get(id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this._pendingRpc.delete(id);
        try { pending.resolve(JSON.parse(resultJSON)); } catch { pending.resolve(null); }
      },
      reject: (id: string, error: string) => {
        const pending = this._pendingRpc.get(id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this._pendingRpc.delete(id);
        pending.reject(error);
      },
    };
  }

  // ── Inbound ──────────────────────────────────────────────────────────────

  private setupInbound(): void {
    // Primary: client script calls mp.trigger("cef::event", "target:name", jsonArgs)
    window.mp?.events.add('cef::event', ((...rawArgs: unknown[]) => {
      const [event, ...rest] = rawArgs as [string, ...unknown[]];
      this.dispatch(event, ...rest);
    }) as (...args: unknown[]) => void);

    // Fallback: browser.execute("window.callHandler('target:name', ...args)")
    window.callHandler = (event: string, ...rawArgs: unknown[]) => {
      this.dispatch(event, ...rawArgs);
    };
  }

  private dispatch(event: string, ...rawArgs: unknown[]): void {
    const parsed = rawArgs.map(tryParseJson);
    const payload = parsed.length === 1 ? parsed[0] : parsed;

    if (import.meta.env.DEV) {
      console.log(`[RageBridge] ← ${event}`, payload);
    }

    eventBus.emit(event as keyof CefEventMap, payload as never);
  }

  // ── Outbound ─────────────────────────────────────────────────────────────

  /**
   * Send an event to the RAGE:MP client script.
   * @example bridge.toClient('player', 'requestData')
   */
  toClient<K extends string>(target: string, name: K, payload?: unknown): void {
    const event = `client::${target}:${name}`;
    const data = JSON.stringify({ event, args: payload !== undefined ? [payload] : [] });

    if (import.meta.env.DEV) {
      console.log(`[RageBridge] → ${event}`, payload);
    }

    window.mp?.trigger('client::eventManager', data);
  }

  /**
   * Send an event to the RAGE:MP server (tunnelled through the client).
   * @example bridge.toServer('bank', 'withdraw', { amount: 500 })
   */
  toServer<K extends string>(target: string, name: K, payload?: unknown): void {
    const event = `server::${target}:${name}`;
    const data = JSON.stringify({ event, args: payload !== undefined ? [payload] : [] });

    if (import.meta.env.DEV) {
      console.log(`[RageBridge] →→ ${event}`, payload);
    }

    window.mp?.trigger('server::eventManager', data);
  }

  /**
   * Fire a request to the game client and await its response.
   * The client must register a handler with mp.events.add('cef::rpc', ...)
   *
   * @example const pos = await bridge.callClient<Vector3>('player', 'getPosition')
   */
  callClient<T = unknown>(name: string, payload?: unknown): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = `${name}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const timer = setTimeout(() => {
        this._pendingRpc.delete(id);
        reject(`[RageBridge] Timeout waiting for client response: ${name}`);
      }, CEF_RPC_TIMEOUT_MS);

      this._pendingRpc.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timer,
      });

      const data = JSON.stringify({ id, name, args: payload !== undefined ? [payload] : [] });

      if (import.meta.env.DEV) {
        console.log(`[RageBridge] ⇄ cef::rpc → ${name}`, payload);
      }

      window.mp?.trigger('cef::rpc', data);
    });
  }

  // ── Dev Mock ─────────────────────────────────────────────────────────────

  private setupDevMock(): void {
    if (!import.meta.env.DEV) return;
    if (window.mp) return; // already provided (e.g. running inside RAGE:MP)

    window.mp = {
      trigger: (...args: unknown[]) => {
        console.log(`[DevMock] mp.trigger("${String(args[0])}")`, ...args.slice(1));
      },
      events: {
        add: (_event: string, _handler: unknown) => {},
        addProc: async (_event: string, _handler: unknown) => {},
      },
    };

    console.info('[RageBridge] Development mode — window.mp is mocked.');
    console.info('Simulate a server→CEF event with:');
    console.info('  window.callHandler("system:setPage", JSON.stringify("hello-world"))');
  }
}

export const rageBridge = new RageBridge();
