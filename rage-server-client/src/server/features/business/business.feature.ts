/**
 * business.feature.ts — Core business RPCs (open/close, transfer, withdraw)
 * and live sync broadcasting.
 *
 * All broadcasts go through broadcastAdd / broadcastUpdate / broadcastRemove
 * so every online client stays in sync without reconnecting.
 */

import { Rpc, notify, log, playerStore } from '../../core';

import * as svc from './business.service';
import type { BusinessType } from '@ragemp/shared';

// ── Broadcast helpers ─────────────────────────────────────────────────────────

/** Broadcast a new or updated business to all online clients. */
export function broadcastAdd(business: Parameters<typeof svc.toDto>[0]): void {
  const dto = JSON.stringify(svc.toDto(business));
  mp.players.forEach((p) => p.call('business:add', [dto]));
}

export function broadcastUpdate(business: Parameters<typeof svc.toDto>[0]): void {
  const dto = JSON.stringify(svc.toDto(business));
  mp.players.forEach((p) => p.call('business:update', [dto]));
}

export function broadcastRemove(businessId: number): void {
  mp.players.forEach((p) => p.call('business:remove', [businessId]));
}

// ── Player session helper ──────────────────────────────────────────────────────

/** Get the active character ID for a player from the session store. */
function characterId(player: PlayerMp): number | null {
  return playerStore.get(player).character?.id ?? null;
}

// ── RPC handlers ──────────────────────────────────────────────────────────────

class BusinessFeature {
  /** Called on spawn — returns all businesses so client can build markers. */
  @Rpc('business:getAll')
  static async getAll(player: PlayerMp): Promise<ReturnType<typeof svc.toDto>[]> {
    const all = await svc.getAllBusinesses();
    return all.map(({ business, zones }) => svc.toDto(business, zones));
  }

  /** Owner or admin toggles business open / closed. */
  @Rpc('business:toggle')
  static async toggle(player: PlayerMp, businessId: number): Promise<{ isOpen: boolean }> {
    const charId = characterId(player);
    const b = await svc.findById(businessId);

    if (!b) {
      notify(player).screen.error('Business not found.');
      return { isOpen: false };
    }
    if (b.ownerId !== charId && !(playerStore.get(player).account?.adminLevel ?? 0 > 0)) {
      notify(player).screen.error('You do not own this business.');
      return { isOpen: b.isOpen };
    }

    await svc.setOpen(b, !b.isOpen);
    broadcastUpdate(b);
    log.info('[Business]', `${player.name} toggled business #${businessId} → ${b.isOpen}`);
    return { isOpen: b.isOpen };
  }

  /** Transfer ownership to another character. */
  @Rpc('business:transfer')
  static async transfer(
    player: PlayerMp,
    businessId: number,
    targetCharacterId: number,
  ): Promise<{ ok: boolean }> {
    const charId = characterId(player);
    const b = await svc.findOwnedBy(businessId, charId!);

    if (!b) {
      notify(player).screen.error('You do not own this business.');
      return { ok: false };
    }

    await svc.transferOwnership(b, targetCharacterId);
    broadcastUpdate(b);
    log.info('[Business]', `${player.name} transferred business #${businessId} → char ${targetCharacterId}`);
    return { ok: true };
  }

  /** Owner withdraws from the business bank. */
  @Rpc('business:withdraw')
  static async withdraw(
    player: PlayerMp,
    businessId: number,
    amount: number,
  ): Promise<{ balance: number }> {
    const charId = characterId(player);

    try {
      const b = await svc.findOwnedBy(businessId, charId!);
      if (!b) {
        notify(player).screen.error('You do not own this business.');
        return { balance: 0 };
      }
      const result = await svc.withdraw(b, amount);
      // TODO: credit amount to player bank/cash via economy service
      notify(player).screen.success(`Withdrew $${amount} from business account.`);
      return result;
    } catch (err: any) {
      notify(player).screen.error(err.message);
      return { balance: 0 };
    }
  }
}

// ── Player world sync ────────────────────────────────────────────────────────
// Called from auth.feature.ts after character:select places the player in-world.

export async function syncPlayerWorld(player: PlayerMp): Promise<void> {
  const all  = await svc.getAllBusinesses();
  const dtos = JSON.stringify(all.map(({ business, zones }) => svc.toDto(business, zones)));
  player.call('business:sync', [dtos]);
  log.info('[Business]', `Synced ${all.length} businesses to ${player.name}`);
}

void BusinessFeature;
