/**
 * Store247Handler.ts — 24/7 convenience store business type plugin.
 *
 * Zones:
 *   customer  — shop entrance, visible when open (blue marker)
 *   owner     — owner management zone (+5m offset by default)
 */

import { BusinessHandler } from '../BusinessHandler';
import { registry, markerSystem } from '../../interaction';
import { clientRpc } from '../../rpc/clientRpc';
import type { BusinessDto } from '@ragemp/shared';

export class Store247Handler extends BusinessHandler {

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
      color:         data.isOpen ? [255, 200, 40, 160] : [100, 100, 100, 120],
      scale:         1.0,
      visibleRadius: 60,
      rotate:        true,
      heightOffset:  -0.95,
    });
    registry.register({
      id:             this.zoneId('customer'),
      label:          data.name,
      subtitle:       '24/7 Store',
      labelRadius:    5.0,
      interactRadius: 2.0,
      snapRadius:     2.0,
      getPosition:    () => custPos,
      menuTitle:      '',
      canInteract:    () => data.isOpen || 'Store is currently closed.',
      items: [
        { label: 'Browse Items', action: 'customer:browse' },
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
      heightOffset:  -0.95,
    });
    registry.register({
      id:             this.zoneId('owner'),
      label:          'Manage Store',
      labelRadius:    4.0,
      interactRadius: 1.5,
      snapRadius:     1.5,
      getPosition:    () => ownerPos,
      menuTitle:      '',
      canInteract:    () => this.isOwner() || 'You do not own this store.',
      items: [
        { label: 'View Stock',   action: 'owner:stock'   },
        { label: 'Restock',      action: 'owner:restock' },
        { label: 'Set Price',    action: 'owner:pricing' },
        { label: 'Open/Close',   action: 'owner:toggle'  },
        { label: 'View Balance', action: 'owner:balance' },
      ],
      onSelect: (action) => this.onOwnerAction(action),
    });
  }

  onUnload(): void {
    ['customer', 'owner'].forEach((z) => {
      registry.unregister(this.zoneId(z));
      markerSystem.unregister(this.zoneId(z));
    });
  }

  override onUpdate(patch: Partial<BusinessDto>): boolean {
    const reloaded = super.onUpdate(patch);

    if (!reloaded && 'isOpen' in patch) {
      markerSystem.unregister(this.zoneId('customer'));
      markerSystem.register({
        id:            this.zoneId('customer'),
        type:          27,
        position:      this.zoneVec('customer', 0, 0),
        color:         this.data.isOpen ? [255, 200, 40, 160] : [100, 100, 100, 120],
        scale:         1.0,
        visibleRadius: 60,
        rotate:        true,
        heightOffset:  -0.95,
      });
    }
    return reloaded;
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  private onCustomerAction(action: string): void {
    switch (action) {
      case 'customer:browse':
        mp.gui.chat.push('!{FFCC44}[Store] Opening store UI… (CEF: store-browse)');
        break;
    }
  }

  private onOwnerAction(action: string): void {
    switch (action) {
      case 'owner:toggle':
        void clientRpc.callServer('business:toggle', this.data.id)
          .then((res) => mp.gui.chat.push(
            `!{44FF88}Store is now ${res.isOpen ? 'OPEN' : 'CLOSED'}.`,
          ));
        break;
      case 'owner:stock':
        mp.gui.chat.push('!{FFCC44}[Store] Stock UI — not yet implemented.');
        break;
      case 'owner:restock':
        mp.gui.chat.push('!{FFCC44}[Store] Restock UI — not yet implemented.');
        break;
      case 'owner:pricing':
        mp.gui.chat.push('!{FFCC44}[Store] Pricing UI — not yet implemented.');
        break;
      case 'owner:balance':
        mp.gui.chat.push('!{FFCC44}[Store] Balance — not yet implemented.');
        break;
    }
  }
}
