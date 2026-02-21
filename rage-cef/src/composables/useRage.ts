import { rageBridge } from '@/core';

/**
 * Composable that exposes outbound RAGE:MP communication helpers.
 *
 * @example
 * const { toClient, toServer } = useRage()
 * toClient('player', 'requestData')
 * toServer('bank', 'withdraw', { amount: 500 })
 */
export function useRage() {
  return {
    toClient: rageBridge.toClient.bind(rageBridge),
    toServer: rageBridge.toServer.bind(rageBridge),
  };
}
