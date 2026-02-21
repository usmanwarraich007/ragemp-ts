import { browserManager } from '../browser';

// ── CEF → Server (Forward direction) ──────────────────────────────────────

/**
 * Receives a RPC request from the CEF (Vue), calls the server via
 * callRemoteProc, and resolves/rejects the CEF Promise via browser.executeRaw.
 */
mp.events.add('rpc:request', async (reqId: string, eventName: string, ...args: unknown[]) => {
  try {
    const result = await mp.events.callRemoteProc('rpc:call', eventName, ...args);
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
