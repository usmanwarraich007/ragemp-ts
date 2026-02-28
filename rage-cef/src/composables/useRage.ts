import { rageBridge } from '@/core';

/**
 * Composable that exposes outbound RAGE:MP communication helpers.
 *
 * @example
 * const { toClient, toServer, callClient } = useRage()
 * toClient('player', 'requestData')
 * toServer('bank', 'withdraw', { amount: 500 })
 * const pos = await callClient<{x:number,y:number,z:number}>('player:getPosition')
 */
export function useRage() {
  return {
    toClient:   rageBridge.toClient.bind(rageBridge),
    toServer:   rageBridge.toServer.bind(rageBridge),
    callClient: rageBridge.callClient.bind(rageBridge),
  };
}
