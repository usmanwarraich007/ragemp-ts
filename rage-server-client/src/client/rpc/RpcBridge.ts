import { browserManager } from '../browser';

// ── CEF → Client RPC (cef::rpc) ───────────────────────────────────────────

type CefRpcHandler = (args: unknown[]) => unknown | Promise<unknown>;
const cefRpcHandlers = new Map<string, CefRpcHandler>();

/**
 * Register a handler that CEF can await via bridge.callClient(name, payload).
 *
 * @example
 * registerCefRpc('player:getPosition', () => {
 *   const p = mp.players.local.position;
 *   return { x: p.x, y: p.y, z: p.z };
 * });
 */
export function registerCefRpc(name: string, handler: CefRpcHandler): void {
  cefRpcHandlers.set(name, handler);
}

mp.events.add('cef::rpc', async (dataJson: string) => {
  let id = '', name = '', args: unknown[] = [];
  try {
    ({ id, name, args } = JSON.parse(dataJson) as { id: string; name: string; args: unknown[] });
    const handler = cefRpcHandlers.get(name);
    if (!handler) throw new Error(`[CefRpc] No handler registered for: ${name}`);
    const result = await handler(args);
    browserManager.executeRaw(
      `window._rageRpc?.resolve(${JSON.stringify(id)}, ${JSON.stringify(JSON.stringify(result ?? null))})`,
    );
  } catch (err) {
    browserManager.executeRaw(
      `window._rageRpc?.reject(${JSON.stringify(id)}, ${JSON.stringify(String(err))})`,
    );
  }
});

// ── CEF → Server (Forward direction) ──────────────────────────────────────

/**
 * Receives a RPC request from the CEF (Vue), calls the server via
 * callRemoteProc, and resolves/rejects the CEF Promise via browser.executeRaw.
 */
mp.events.add('rpc:request', async (reqId: string, eventName: string, argsJSON: string) => {
  try {
    // CEF packs all args as a single JSON string to preserve objects across the trigger boundary.
    const args = (argsJSON ? JSON.parse(argsJSON) : []) as unknown[];
    // Also pack args as JSON for the client→server callRemoteProc boundary,
    // which has the same object coercion problem as mp.trigger.
    const result = await mp.events.callRemoteProc('rpc:call', eventName, JSON.stringify(args));
    const resultJSON = JSON.stringify(result ?? null);
    browserManager.executeRaw(`window.rpc.resolve(${JSON.stringify(reqId)}, ${resultJSON})`);
  } catch (err) {
    browserManager.executeRaw(
      `window.rpc.reject(${JSON.stringify(reqId)}, ${JSON.stringify(String(err))})`,
    );
  }
});

// ── Server → CEF (Reverse direction) ──────────────────────────────────────

/**
 * Receives a reverse request from the server and passes it to the CEF
 * handler via browser.executeRaw → window.rpc.triggerCEF.
 */
mp.events.add('rpc:serverRequest', (id: string, eventName: string, argsJSON: string) => {
  browserManager.executeRaw(
    `window.rpc.triggerCEF(${JSON.stringify(id)}, ${JSON.stringify(eventName)}, ${JSON.stringify(argsJSON)})`,
  );
});

/**
 * Receives the CEF handler's answer and forwards it to the server.
 */
mp.events.add('rpc:clientResolve', (id: string, resultJSON: string, errorMsg?: string) => {
  if (errorMsg) {
    mp.events.callRemote('rpc:serverReject', id, errorMsg);
  } else {
    mp.events.callRemote('rpc:serverResolve', id, resultJSON);
  }
});

// ── Server → CEF response handlers ────────────────────────────────────────

type PendingServerRequest = {
  resolve: (value: unknown) => void;
  reject: (reason: string) => void;
  timer: ReturnType<typeof setTimeout>;
};

const RPC_TIMEOUT_MS = 10_000;
const pendingServerRequests = new Map<string, PendingServerRequest>();

/** Used by server/core/Rpc.ts to register a pending client-side promise. */
export function registerPendingCall(
  id: string,
  resolve: (v: unknown) => void,
  reject: (r: string) => void,
): ReturnType<typeof setTimeout> {
  const timer = setTimeout(() => {
    pendingServerRequests.delete(id);
    reject(`[RPC] Timeout waiting for CEF response (id: ${id})`);
  }, RPC_TIMEOUT_MS);

  pendingServerRequests.set(id, { resolve, reject, timer });
  return timer;
}

mp.events.add('rpc:serverResolve', (id: string, resultJSON: string) => {
  const req = pendingServerRequests.get(id);
  if (!req) return;
  clearTimeout(req.timer);
  try {
    req.resolve(JSON.parse(resultJSON));
  } catch {
    req.resolve(null);
  }
  pendingServerRequests.delete(id);
});

mp.events.add('rpc:serverReject', (id: string, error: string) => {
  const req = pendingServerRequests.get(id);
  if (!req) return;
  clearTimeout(req.timer);
  req.reject(error);
  pendingServerRequests.delete(id);
});
