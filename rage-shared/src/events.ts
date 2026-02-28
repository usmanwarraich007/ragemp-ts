// Shared CEF event map
// Format: "target:name" -> payload type
// Used by EventBus for type-safe event routing

import type { SpeedometerData, AreaData, InteractButton } from './types/hud';
import type { PlayerStats } from './types/player';

export interface NotificationPayload {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  /** Duration in ms before auto-dismiss. Default: 4000 */
  duration?: number;
}

export interface CefEventMap {
  // System — page routing
  /** Switch the active full-screen page (clears popup, optionally passes data). */
  'system:setPage': { page: string | null; data?: unknown; suppressHud?: boolean };
  /** Open a popup/modal above the current page without clearing it. */
  'system:setPopup': { popup: string; data?: unknown };
  /** Dismiss the current popup. */
  'system:clearPopup': void;
  /** Force-show or force-hide the entire HUD layer. */
  'system:setHudVisible': boolean;

  // HUD
  'hud:setVehicleData': { key: keyof SpeedometerData; data: SpeedometerData[keyof SpeedometerData] };
  'hud:setAreaData': AreaData;
  'hud:showInteractButton': InteractButton | null;

  // Notifications
  'notify:show': NotificationPayload;

  // Player
  'player:setStats': PlayerStats;
  'player:setDead': boolean;
}

// Helper type: get payload type for a given event key
export type CefEventPayload<K extends keyof CefEventMap> = CefEventMap[K];
