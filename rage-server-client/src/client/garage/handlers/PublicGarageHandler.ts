/**
 * PublicGarageHandler.ts — Public garage type plugin.
 *
 * Zones:
 *   entrance — where the interaction marker appears (player walks to browse)
 *   spawn    — where the vehicle is placed on retrieve
 *
 * Admin sets both via: /garage setzone [id] entrance  /  /garage setzone [id] spawn
 */

import { GarageHandler }   from '../GarageHandler';
import { registry, markerSystem } from '../../interaction';
import { clientRpc }        from '../../rpc/clientRpc';
import { browserManager }   from '../../browser';
import type { GarageDto }   from '@ragemp/shared';

export class PublicGarageHandler extends GarageHandler {

  onLoad(): void {
    const { data } = this;

    const entrancePos = this.zoneVec('entrance', 0, 0);

    // ── Entrance marker ────────────────────────────────────────────────────
    markerSystem.register({
      id:            this.zoneId('entrance'),
      type:          27,
      position:      entrancePos,
      color:         [80, 180, 255, 160],
      scale:         1.0,
      visibleRadius: 60,
      rotate:        true,
      heightOffset:  -0.95,
    });

    // ── Interaction zone ───────────────────────────────────────────────────
    registry.register({
      id:             this.zoneId('entrance'),
      label:          data.name,
      subtitle:       `$${data.parkFee} to park`,
      labelRadius:    5.0,
      interactRadius: 2.0,
      snapRadius:     1.5,

      getPosition: () => {
        try { return this.zoneVec('entrance', 0, 0); }
        catch { return null; }
      },

      canInteract: (): boolean | string => {
        // Must be on foot to browse
        if (mp.players.local.vehicle) return 'Exit your vehicle to browse.';
        return true;
      },

      items: [{ label: 'Browse Vehicles', action: 'browse' }],

      onSelect: (action: string) => {
        if (action !== 'browse') return;
        void (async () => {
          try {
            const vehicles = await clientRpc.callServer('garage:getVehicles', data.id);
            browserManager.show('garage-browse', { garageId: data.id, garageName: data.name, vehicles });
          } catch {
            mp.gui.chat.push('!{FF4444}Could not load garage vehicles.');
          }
        })();
      },
    });
  }

  onUnload(): void {
    markerSystem.unregister(this.zoneId('entrance'));
    registry.unregister(this.zoneId('entrance'));
  }
}
