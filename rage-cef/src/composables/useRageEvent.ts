import { onMounted, onUnmounted } from 'vue';
import type { CefEventMap } from '@ragemp/shared';
import { eventBus } from '@/core';

/**
 * Composable that registers a typed CEF event handler scoped to the
 * component's lifecycle. Automatically unregisters on unmount.
 *
 * @example
 * useRageEvent('hud:setVehicleData', (data) => {
 *   store.vehicleData = data
 * })
 */
export function useRageEvent<K extends keyof CefEventMap>(
  event: K,
  handler: (payload: CefEventMap[K]) => void,
): void {
  onMounted(() => {
    eventBus.on(event, handler);
  });

  onUnmounted(() => {
    eventBus.off(event);
  });
}
