import type { ServerRPCs } from '@ragemp/shared';

/**
 * Typed RPC helper for the RAGE:MP client (non-CEF) context.
 * Mirrors the `rpc.callServer()` API available in CEF.
 *
 * Usage:
 *   await clientRpc.callServer('tpm:teleport', x, y, z);
 */
export const clientRpc = {
  callServer<K extends keyof ServerRPCs>(
    proc: K,
    ...args: Parameters<ServerRPCs[K]>
  ): Promise<ReturnType<ServerRPCs[K]>> {
    return mp.events.callRemoteProc('rpc:call', proc, ...args) as Promise<
      ReturnType<ServerRPCs[K]>
    >;
  },
};
