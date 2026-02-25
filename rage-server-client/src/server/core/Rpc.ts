import type { ClientRPCs } from '@ragemp/shared';

// ── @Rpc Decorator ─────────────────────────────────────────────────────────

/**
 * Global map of all registered server RPC handlers.
 * Populated at module load time by the @Rpc decorator.
 */
export const rpcHandlers = new Map<string, (player: PlayerMp, ...args: unknown[]) => unknown>();

/**
 * Decorator that registers a static class method as an RPC handler.
 *
 * @example
 * class AuthService {
 *   \@Rpc('auth:login')
 *   static async login(player: PlayerMp, username: string, password: string) {
 *     return { success: true };
 *   }
 * }
 */
export function Rpc(eventName: string) {
  return function (
    target: object,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ): void {
    // Bind to `target` so instance methods that use `this` work correctly
    rpcHandlers.set(eventName, descriptor.value.bind(target));
  };
}

// ── Server → CEF RPC ───────────────────────────────────────────────────────

const RPC_TIMEOUT_MS = 10_000;
const pendingCalls = new Map<
  string,
  { resolve: (v: unknown) => void; reject: (r: string) => void; timer: NodeJS.Timeout }
>();

/**
 * Server-side RPC caller. Sends a request to the player's CEF instance
 * and awaits the result with full type safety.
 *
 * @example
 * const confirmed = await rpc.callClient(player, 'ui:confirmDialog', 'Are you sure?');
 */
export const rpc = {
  callClient<K extends keyof ClientRPCs>(
    player: PlayerMp,
    eventName: K,
    ...args: Parameters<ClientRPCs[K]>
  ): Promise<ReturnType<ClientRPCs[K]>> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(2, 15);

      const timer = setTimeout(() => {
        pendingCalls.delete(id);
        reject(`[RPC] Timeout: CEF did not respond to "${String(eventName)}" within ${RPC_TIMEOUT_MS}ms`);
      }, RPC_TIMEOUT_MS) as unknown as NodeJS.Timeout;

      pendingCalls.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });

      // Trigger client bridge — passes request through to CEF
      player.call('rpc:serverRequest', [id, eventName, JSON.stringify(args)]);
    });
  },
};

// ── addProc listener — single entry point for all server RPCs ──────────────

mp.events.addProc('rpc:call', async (player: PlayerMp, eventName: string, argsJSON: string) => {
  const handler = rpcHandlers.get(eventName);

  if (!handler) {
    console.error(`[RPC] No handler registered for: "${eventName}"`);
    throw new Error(`Procedure not found: ${eventName}`);
  }

  try {
    // Client packs all args as JSON to preserve complex objects across callRemoteProc boundary.
    const args = (argsJSON ? JSON.parse(argsJSON) : []) as unknown[];
    return await handler(player, ...args);
  } catch (err) {
    console.error(`[RPC Error] "${eventName}":`, err);
    throw String(err);
  }
});

// ── Listeners for Server→CEF reverse-direction responses ──────────────────

mp.events.add('rpc:serverResolve', (player: PlayerMp, id: string, resultJSON: string) => {
  void player; // unused — kept for RAGE:MP event signature
  const req = pendingCalls.get(id);
  if (!req) return;
  clearTimeout(req.timer);
  try {
    req.resolve(JSON.parse(resultJSON));
  } catch {
    req.resolve(null);
  }
  pendingCalls.delete(id);
});

mp.events.add('rpc:serverReject', (player: PlayerMp, id: string, error: string) => {
  void player;
  const req = pendingCalls.get(id);
  if (!req) return;
  clearTimeout(req.timer);
  req.reject(error);
  pendingCalls.delete(id);
});
