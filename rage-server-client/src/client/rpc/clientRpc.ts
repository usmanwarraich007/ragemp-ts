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
    // Server's rpc:call addProc handler expects (player, eventName, argsJSON)
    // where argsJSON is a single JSON-encoded string of the args array.
    // Spreading args raw would send them as separate RAGE:MP event args, not matching the server signature.
    const argsJSON = JSON.stringify(args);
    return mp.events.callRemoteProc('rpc:call', proc, argsJSON) as Promise<
      ReturnType<ServerRPCs[K]>
    >;
  },
};
