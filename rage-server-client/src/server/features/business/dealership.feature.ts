/**
 * dealership.feature.ts — Dealership RPCs: browse stock, buy vehicle,
 * set price, restock inventory.
 */

import { Rpc, notify, log } from '../../core';
import * as svc from '../business/business.service';

// ── Helper ────────────────────────────────────────────────────────────────────

function characterId(player: PlayerMp): number | null {
  return (player as any).characterId ?? null;
}

// ── RPCs ──────────────────────────────────────────────────────────────────────

class DealershipFeature {
  /** Customer / owner calls this to see current vehicle stock. */
  @Rpc('dealership:getStock')
  static async getStock(
    player: PlayerMp,
    businessId: number,
  ): Promise<ReturnType<typeof svc.toInventoryDto>[]> {
    const items = await svc.getInventory(businessId);
    return items.map(svc.toInventoryDto);
  }

  /** Customer purchases a vehicle from the dealership. */
  @Rpc('dealership:buyVehicle')
  static async buyVehicle(
    player: PlayerMp,
    businessId: number,
    itemKey: string,
  ): Promise<{ ok: boolean; message?: string }> {
    const b = await svc.findById(businessId);
    if (!b || !b.isOpen) return { ok: false, message: 'Dealership is not open.' };

    const item = await svc.getInventoryItem(businessId, itemKey);
    if (!item || item.stock <= 0) return { ok: false, message: 'Vehicle out of stock.' };

    const price = Number(item.sellPrice);
    // TODO: deduct price from player character cash/bank via economy service
    // For now, log and skip payment
    await svc.deductStock(businessId, itemKey);

    // Profit → business balance
    b.balance = Number(b.balance) + price;
    await b.save();

    // Spawn vehicle near business anchor (player can tp to it or it spawns behind them)
    const spawnPos = new mp.Vector3(b.x + 5, b.y, b.z);
    mp.vehicles.new(mp.joaat(itemKey), spawnPos, {
      heading: 0,
      numberPlate: player.name.toUpperCase().slice(0, 8),
      color: [[255, 255, 255], [255, 255, 255]],
    });

    notify(player).screen.success(`You purchased a ${itemKey} for $${price}!`);
    log.info('[Dealership]', `${player.name} bought ${itemKey} from business #${businessId}`);
    return { ok: true };
  }

  /** Owner sets the sell price for a vehicle model. */
  @Rpc('dealership:setPrice')
  static async setPrice(
    player: PlayerMp,
    businessId: number,
    itemKey: string,
    price: number,
  ): Promise<{ ok: boolean }> {
    const charId = characterId(player);
    const b = await svc.findOwnedBy(businessId, charId!);
    if (!b) {
      notify(player).screen.error('You do not own this dealership.');
      return { ok: false };
    }

    await svc.setItemSellPrice(businessId, itemKey, price);
    log.info('[Dealership]', `${player.name} set ${itemKey} price to $${price} on business #${businessId}`);
    return { ok: true };
  }

  /**
   * Owner restocks a vehicle model.
   * purchasePrice: cost to the owner per unit (deducted from business balance).
   */
  @Rpc('dealership:restock')
  static async restock(
    player: PlayerMp,
    businessId: number,
    itemKey: string,
    quantity: number,
    purchasePrice: number,
  ): Promise<{ ok: boolean }> {
    const charId = characterId(player);
    const b = await svc.findOwnedBy(businessId, charId!);
    if (!b) {
      notify(player).screen.error('You do not own this dealership.');
      return { ok: false };
    }

    const totalCost = purchasePrice * quantity;
    const balance   = Number(b.balance);
    if (balance < totalCost) {
      notify(player).screen.error(`Insufficient funds. Need $${totalCost}, have $${balance}.`);
      return { ok: false };
    }

    b.balance = balance - totalCost;
    await b.save();

    const existing = await svc.getInventoryItem(businessId, itemKey);
    await svc.upsertInventoryItem(
      businessId,
      itemKey,
      quantity,
      purchasePrice,
      existing ? Number(existing.sellPrice) : purchasePrice * 1.3, // default 30% markup
    );

    notify(player).screen.success(`Restocked ${quantity}× ${itemKey}.`);
    log.info('[Dealership]', `${player.name} restocked ${quantity}× ${itemKey} at #${businessId}`);
    return { ok: true };
  }
}

void DealershipFeature;
