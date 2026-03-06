// Shared CEF event map
// Format: "target:name" -> payload type
// Used by EventBus for type-safe event routing

import type { SpeedometerData, AreaData, InteractButton } from './types/hud';
import type { PlayerStats } from './types/player';
import type { BusinessDto, DealershipStockItemDto, DealershipManageDto } from './types/business';

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

  // Business — server → client broadcasts
  /** Full initial sync sent to a client when they spawn into the world. */
  'business:sync':   string; // JSON-serialised BusinessDto[]
  /** A new business was created; add it to the local store. */
  'business:add':    string; // JSON-serialised BusinessDto
  /** An existing business changed state (open/closed, owner, balance). */
  'business:update': string; // JSON-serialised BusinessDto
  /** A business was deleted; remove it from the local store. */
  'business:remove': number; // businessId

  // Dealership — server pushes data then shows page
  /** Sent to customer before showing dealership-browse page. */
  'dealership:openBrowse': { businessId: number; name: string; stock: DealershipStockItemDto[] };
  /** Sent to dealership owner before showing dealership-manage page. */
  'dealership:openManage': DealershipManageDto;
}

// Helper type: get payload type for a given event key
export type CefEventPayload<K extends keyof CefEventMap> = CefEventMap[K];
