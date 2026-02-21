// Shared CEF event map
// Format: "target:name" -> payload type
// Used by EventBus for type-safe event routing

import type { SpeedometerData, AreaData, InteractButton } from './types/hud';
import type { PlayerStats } from './types/player';

export interface CefEventMap {
  // System
  'system:setPage': string | null;

  // HUD
  'hud:setVehicleData': { key: keyof SpeedometerData; data: SpeedometerData[keyof SpeedometerData] };
  'hud:setAreaData': AreaData;
  'hud:showInteractButton': InteractButton | null;

  // Notifications
  'notify:show': { type: string; message: string; skin?: 'light' | 'dark' | 'colored' };

  // Player
  'player:setStats': PlayerStats;
  'player:setDead': boolean;
}

// Helper type: get payload type for a given event key
export type CefEventPayload<K extends keyof CefEventMap> = CefEventMap[K];
