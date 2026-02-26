/**
 * DealershipHandler.ts — Dealership business type plugin.
 *
 * Zone positions are read from data.zones (stored in DB via /business setzone).
 * Default fallbacks apply on first create until admin positions each zone manually.
 *
 * Default offsets from anchor:
 *   customer  (+0, +0)   — customer entrance
 *   owner     (+5, +0)   — owner management zone
 *   showcase  (-3, +4)   — vehicle spawn / showcase ring
 */

import { BusinessHandler }  from '../BusinessHandler';
import { registry, markerSystem } from '../../interaction';
import { clientRpc }         from '../../rpc/clientRpc';
import type { BusinessDto }  from '@ragemp/shared';

export class DealershipHandler extends BusinessHandler {

  /** Read zone position from DB, or fall back to anchor + offset. */
  private zoneVec(key: string, dx = 0, dy = 0, dz = 0): Vector3 {
    const z = this.data.zones?.[key];
    return z
      ? new mp.Vector3(z.x, z.y, z.z)
      : new mp.Vector3(this.data.x + dx, this.data.y + dy, this.data.z + dz);
  }

  onLoad(): void {
    const { data } = this;

    // ── Customer zone ─────────────────────────────────────────────────────
    const custPos = this.zoneVec('customer', 0, 0);
    markerSystem.register({
      id:            this.zoneId('customer'),
      type:          27,
      position:      custPos,
      color:         data.isOpen ? [80, 200, 255, 160] : [100, 100, 100, 120],
      scale:         1.0,
      visibleRadius: 60,
      rotate:        true,
      heightOffset:  -0.1,
    });
    registry.register({
      id:             this.zoneId('customer'),
      label:          data.name,
      subtitle:       'Vehicle Dealership',
      labelRadius:    5.0,
      interactRadius: 2.0,
      snapRadius:     2.0,
      getPosition:    () => custPos,
      menuTitle:      '',
      canInteract:    () => this.data.isOpen || 'Dealership is currently closed.',
      items: [
        { label: 'Browse Vehicles', action: 'customer:browse'  },
        { label: 'Test Drive',      action: 'customer:test'    },
      ],
      onSelect: (action) => this.onCustomerAction(action),
    });

    // ── Owner zone ────────────────────────────────────────────────────────
    const ownerPos = this.zoneVec('owner', 5, 0);
    markerSystem.register({
      id:            this.zoneId('owner'),
      type:          27,
      position:      ownerPos,
      color:         [255, 180, 40, 160],
      scale:         0.8,
      visibleRadius: 30,
      rotate:        true,
      heightOffset:  -0.1,
    });
    registry.register({
      id:             this.zoneId('owner'),
      label:          'Manage Dealership',
      labelRadius:    4.0,
      interactRadius: 1.5,
      snapRadius:     1.5,
      getPosition:    () => ownerPos,
      menuTitle:      '',
      canInteract:    () => this.isOwner() || 'You do not own this dealership.',
      items: [
        { label: 'View Stock',   action: 'owner:stock'    },
        { label: 'Restock',      action: 'owner:restock'  },
        { label: 'Set Price',    action: 'owner:pricing'  },
        { label: 'Open/Close',   action: 'owner:toggle'   },
        { label: 'View Balance', action: 'owner:balance'  },
      ],
      onSelect: (action) => this.onOwnerAction(action),
    });

    // ── Showcase zone (display-only flat ring) ────────────────────────────
    const showcasePos = this.zoneVec('showcase', -3, 4);
    markerSystem.register({
      id:            this.zoneId('showcase'),
      type:          1,
      position:      showcasePos,
      color:         [255, 255, 255, 60],
      scale:         2.0,
      visibleRadius: 20,
      rotate:        false,
    });
  }

  onUnload(): void {
    ['customer', 'owner', 'showcase'].forEach((z) => {
      registry.unregister(this.zoneId(z));
      markerSystem.unregister(this.zoneId(z));
    });
  }

  override onUpdate(patch: Partial<BusinessDto>): boolean {
    // super merges data and handles position/zone full reload.
    // Returns true if onLoad() was already called (markers already re-registered).
    const reloaded = super.onUpdate(patch);

    // Lightweight colour flip — only when isOpen changed alone (no full reload)
    if (!reloaded && 'isOpen' in patch) {
      markerSystem.unregister(this.zoneId('customer'));
      markerSystem.register({
        id:            this.zoneId('customer'),
        type:          27,
        position:      this.zoneVec('customer', 0, 0),
        color:         this.data.isOpen ? [80, 200, 255, 160] : [100, 100, 100, 120],
        scale:         1.0,
        visibleRadius: 60,
        rotate:        true,
        heightOffset:  -0.1,
      });
    }
    return reloaded;
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  private onCustomerAction(action: string): void {
    switch (action) {
      case 'customer:browse':
        mp.gui.chat.push('!{44AAFF}[Dealership] Opening browse UI… (CEF: dealership-browse)');
        break;
      case 'customer:test':
        mp.gui.chat.push('!{44AAFF}[Dealership] Test drive — not yet implemented.');
        break;
    }
  }

  private onOwnerAction(action: string): void {
    switch (action) {
      case 'owner:toggle':
        void clientRpc.callServer('business:toggle', this.data.id)
          .then((res) => mp.gui.chat.push(
            `!{44FF88}Dealership is now ${res.isOpen ? 'OPEN' : 'CLOSED'}.`,
          ));
        break;
      case 'owner:stock':
        mp.gui.chat.push('!{44AAFF}[Dealership] Opening stock UI… (CEF: dealership-manage)');
        break;
      case 'owner:restock':
        mp.gui.chat.push('!{44AAFF}[Dealership] Restock UI — not yet implemented.');
        break;
      case 'owner:pricing':
        mp.gui.chat.push('!{44AAFF}[Dealership] Pricing UI — not yet implemented.');
        break;
      case 'owner:balance':
        mp.gui.chat.push('!{44AAFF}[Dealership] Balance — not yet implemented.');
        break;
    }
  }
}
