/**
 * dealership.feature.ts — Dealership RPCs: browse stock, buy vehicle,
 * owner management (restock, set price, remove) and manage page data.
 *
 * buyVehicle now creates a PlayerVehicle DB row (not an immediate spawn).
 * The player retrieves their car from a garage / parking lot.
 */

import { Rpc, notify, log, playerStore } from '../../core';
import * as svc from '../business/business.service';
import * as catSvc from '../vehicles/vehicle-model-config.service';
import { vehicleManager } from '../vehicles/vehicle-manager.server';
import type { DealershipStockItemDto, DealershipManageDto } from '@ragemp/shared';

// ── Helper ────────────────────────────────────────────────────────────────────

function characterId(player: PlayerMp): number | null {
  return playerStore.get(player).character?.id ?? null;
}

function isAdmin(player: PlayerMp): boolean {
  return (playerStore.get(player).account?.adminLevel ?? 0) > 0;
}

// ── Preview session store ─────────────────────────────────────────────────

interface PreviewSession {
  vehicle:     VehicleMp | null; // null until player picks a model
  model:       string | null;    // currently previewed model name
  businessId:  number;
  showcasePos: { x: number; y: number; z: number; heading: number };
  savedPos:    { x: number; y: number; z: number; heading: number };
}

const previewSessions = new Map<number, PreviewSession>(); // keyed by player.id

// Clean up on disconnect
mp.events.add('playerQuit', (player: PlayerMp) => {
  const session = previewSessions.get(player.id);
  if (session?.vehicle) {
    try { if (mp.vehicles.exists(session.vehicle)) session.vehicle.destroy(); } catch { /* ignore */ }
  }
  previewSessions.delete(player.id);
});

// ── Helpers ──────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = (hex ?? '#ffffff').replace('#', '').padEnd(6, '0');
  return [
    parseInt(clean.substring(0, 2), 16) || 255,
    parseInt(clean.substring(2, 4), 16) || 255,
    parseInt(clean.substring(4, 6), 16) || 255,
  ];
}

/**
 * Scans leftward slots from the base position until a clear spot is found.
 *
 * GTA V uses compass headings (0 = North/+Y, 90 = East/+X, clockwise).
 * Forward vector = (sin(h), cos(h)).
 * Left perpendicular = (-cos(h), sin(h)).
 */
function findFreeSlot(
  base: { x: number; y: number; z: number },
  heading: number,
): { x: number; y: number; z: number; heading: number } {
  const vehicles  = mp.vehicles.toArray();
  const headingRad = heading * (Math.PI / 180);
  // Left-perpendicular in GTA coordinate space
  const lx = -Math.cos(headingRad);
  const ly =  Math.sin(headingRad);

  for (let slot = 0; slot < 8; slot++) {
    const dist = slot * 3; // 0m, 3m, 6m … closer side-by-side spacing
    const cx = base.x + lx * dist;
    const cy = base.y + ly * dist;
    const tooClose = vehicles.some((v) => {
      const p = v.position;
      const dx = p.x - cx, dy = p.y - cy;
      return Math.sqrt(dx * dx + dy * dy) < 2.5;
    });
    if (!tooClose) return { x: cx, y: cy, z: base.z, heading };
  }
  // Fallback: 25m to the left
  return { x: base.x + lx * 25, y: base.y + ly * 25, z: base.z, heading };
}


function spawnPreviewVehicle(
  model: string,
  pos: { x: number; y: number; z: number; heading: number },
  colorHex: string,
  dimension: number,
): VehicleMp {
  const veh = mp.vehicles.new(mp.joaat(model), new mp.Vector3(pos.x, pos.y, pos.z), {
    heading:     pos.heading,
    numberPlate: 'PREVIEW',
    dimension,
    locked:      false,
  });
  // Set both primary and secondary so the car looks correct on stream-in
  veh.setVariable('colorPrimary',   colorHex);
  veh.setVariable('colorSecondary', colorHex);
  veh.setVariable('dbId', -1); // marks it as managed for vehicle-stream.ts
  veh.rotation = new mp.Vector3(0, 0, pos.heading);
  return veh;
}

// ── Plate generator ───────────────────────────────────────────────────────────

function generatePlate(): string {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const nums  = '0123456789';
  const rand  = (s: string) => s[Math.floor(Math.random() * s.length)];
  return `${rand(chars)}${rand(chars)}${rand(nums)}${rand(nums)}${rand(chars)}${rand(chars)}${rand(nums)}`;
}

// ── RPCs ──────────────────────────────────────────────────────────────────────

class DealershipFeature {

  /** Customer — returns live inventory enriched with VehicleModelConfig. */
  @Rpc('dealership:getStock')
  static async getStock(
    player: PlayerMp,
    businessId: number,
  ): Promise<DealershipStockItemDto[]> {
    const items   = await svc.getInventory(businessId);
    const catalog = await catSvc.getAll();
    const catMap  = new Map(catalog.map((c) => [c.model, c]));

    const result: DealershipStockItemDto[] = [];
    for (const item of items) {
      const config = catMap.get(item.itemKey);
      if (!config || item.stock <= 0) continue; // skip unconfigured or OOS
      result.push({
        config,
        stock: item.stock,
        price: Number(item.sellPrice),
        invId: item.id,
      });
    }
    return result;
  }

  /**
   * Customer purchases a vehicle.
   * Creates a PlayerVehicle in the DB with the chosen color.
   * No vehicle is spawned — player retrieves it from a garage.
   */
  @Rpc('dealership:buyVehicle')
  static async buyVehicle(
    player: PlayerMp,
    businessId: number,
    itemKey: string,
    colorHex: string,
  ): Promise<{ ok: boolean; message?: string }> {
    const b = await svc.findById(businessId);
    if (!b || !b.isOpen) return { ok: false, message: 'Dealership is not open.' };

    const item = await svc.getInventoryItem(businessId, itemKey);
    if (!item || item.stock <= 0) return { ok: false, message: 'Vehicle out of stock.' };

    const config = await catSvc.findByModel(itemKey);
    if (!config) return { ok: false, message: 'Vehicle not configured in catalog.' };

    const charId = characterId(player);
    if (!charId) return { ok: false, message: 'No active character.' };

    const price = Number(item.sellPrice);
    // TODO: deduct price from player cash/bank via economy service
    // await economyService.charge(charId, price);

    await svc.deductStock(businessId, itemKey);

    // ── Determine spawn position ──────────────────────────────────────────────
    // Use the session's showcase slot (where they were previewing).
    // Destroy the temp preview vehicle first.
    const session = previewSessions.get(player.id);
    let spawnSlot: { x: number; y: number; z: number; heading: number };

    if (session) {
      if (session.vehicle) {
        try { if (mp.vehicles.exists(session.vehicle)) session.vehicle.destroy(); } catch { /* ignore */ }
      }
      previewSessions.delete(player.id);
      spawnSlot = session.showcasePos;
    } else {
      // Fallback: find free slot near player
      const pos = player.position;
      spawnSlot = findFreeSlot({ x: pos.x, y: pos.y, z: pos.z }, player.heading);
    }

    // Create the owned vehicle DB record (fuel from catalog, color into cosmetics row)
    const plate  = generatePlate();
    const dbVeh  = await vehicleManager.createVehicle(charId, itemKey, plate, colorHex || '#ffffff');

    // Spawn the live vehicle at the showcase position and put the player inside
    const liveVeh = await vehicleManager.spawn(dbVeh.id, spawnSlot);
    if (liveVeh) {
      liveVeh.mp.setVariable('colorPrimary',   colorHex || '#ffffff');
      liveVeh.mp.setVariable('colorSecondary', colorHex || '#ffffff');
      player.call('dealership:previewFreeze', [false]);
      player.putIntoVehicle(liveVeh.mp, 0); // seat 0 = driver
    }

    // Credit dealership balance
    b.balance = Number(b.balance) + price;
    await b.save();

    notify(player).screen.success(`You purchased a ${config.label} for $${price.toLocaleString()}! Enjoy your new ride.`);
    log.info('[Dealership]', `${player.name} (char#${charId}) bought ${itemKey} from business #${businessId} · plate: ${plate}`);
    return { ok: true };
  }

  // ── Preview RPCs ────────────────────────────────────────────────────────────────

  /**
   * Called when player opens Browse Vehicles.
   * Saves player position, spawns a temp preview vehicle at the showcase zone,
   * and puts the player inside it.
   */
  @Rpc('dealership:enterShowcase')
  static async enterShowcase(player: PlayerMp, businessId: number): Promise<{ ok: boolean }> {
    // Destroy any stale session for this player
    const stale = previewSessions.get(player.id);
    if (stale?.vehicle) {
      try { if (mp.vehicles.exists(stale.vehicle)) stale.vehicle.destroy(); } catch { /* ignore */ }
    }
    previewSessions.delete(player.id);

    // Get showcase zone
    const zones = await svc.getZones(businessId);
    const showcaseZone = zones.find((z) => z.zoneKey === 'showcase');
    const b = await svc.findById(businessId);
    if (!b) return { ok: false };

    const base = showcaseZone
      ? { x: showcaseZone.x, y: showcaseZone.y, z: showcaseZone.z }
      : { x: b.x - 3, y: b.y + 4, z: b.z };
    const baseHeading = showcaseZone?.heading ?? 0;

    // Find a free slot — vehicle will spawn here when the player picks a model
    const slot = findFreeSlot(base, baseHeading);

    // Save player state — no vehicle spawned yet
    const pos = player.position;
    previewSessions.set(player.id, {
      vehicle:     null,
      model:       null,
      businessId,
      showcasePos: slot,
      savedPos:    { x: pos.x, y: pos.y, z: pos.z, heading: player.heading },
    });

    return { ok: true };
  }

  /**
   * Called when player selects a different model or color in the CEF.
   * Swaps the preview vehicle in-place at the same showcase slot.
   */
  @Rpc('dealership:changePreview')
  static changePreview(player: PlayerMp, model: string, colorHex: string): void {
    const session = previewSessions.get(player.id);
    if (!session) return;

    // Same model already in the slot — just update the color live, skip respawn
    if (
      session.model === model &&
      session.vehicle !== null &&
      mp.vehicles.exists(session.vehicle)
    ) {
      // setVariable alone won't repaint a vehicle the player is already sitting in;
      // use player.call() so the client applies the native immediately.
      session.vehicle.setVariable('colorPrimary',   colorHex);
      session.vehicle.setVariable('colorSecondary', colorHex);
      player.call('vehicle:previewRecolor', [colorHex]);
      return;
    }

    // Different model (or first selection) — destroy old and spawn new
    if (session.vehicle) {
      try { if (mp.vehicles.exists(session.vehicle)) session.vehicle.destroy(); } catch { /* ignore */ }
    }

    const newVeh = spawnPreviewVehicle(model, session.showcasePos, colorHex, player.dimension);
    player.putIntoVehicle(newVeh, 0); // seat 0 = driver
    // Freeze client + pass colorHex so it can be applied directly via native
    player.call('dealership:previewFreeze', [true, colorHex]);
    session.vehicle = newVeh;
    session.model   = model;
  }

  /**
   * Called when player closes Browse Vehicles without purchasing.
   * Destroys the preview vehicle and returns player to their original position.
   */
  @Rpc('dealership:exitShowcase')
  static exitShowcase(player: PlayerMp): void {
    const session = previewSessions.get(player.id);
    if (!session) return;

    if (session.vehicle) {
      try { if (mp.vehicles.exists(session.vehicle)) session.vehicle.destroy(); } catch { /* ignore */ }
    }
    previewSessions.delete(player.id);

    // Unfreeze before teleporting
    player.call('dealership:previewFreeze', [false]);
    const { x, y, z, heading } = session.savedPos;
    player.position = new mp.Vector3(x, y, z);
    player.heading  = heading;
  }

  // ── Owner management ───────────────────────────────────────────────────────

  /**
   * Returns everything the owner management CEF page needs in one call:
   * live stock enriched with catalog + full catalog for "Add Stock" dropdown.
   */
  @Rpc('dealership:getManageData')
  static async getManageData(
    player: PlayerMp,
    businessId: number,
  ): Promise<DealershipManageDto> {
    const charId  = characterId(player);
    const b       = await svc.findById(businessId);

    if (!b) {
      notify(player).screen.error('Business not found.');
      return { businessId, name: '', balance: 0, isOpen: false, stock: [], catalog: [] };
    }

    const isOwnerOrAdmin = Number(b.ownerId) === charId || isAdmin(player);
    if (!isOwnerOrAdmin) {
      notify(player).screen.error('Access denied.');
      return { businessId, name: b.name, balance: 0, isOpen: b.isOpen, stock: [], catalog: [] };
    }

    const [items, catalog] = await Promise.all([
      svc.getInventory(businessId),
      catSvc.getAll(),
    ]);
    const catMap = new Map(catalog.map((c) => [c.model, c]));

    const stock = items
      .map((item) => {
        const config = catMap.get(item.itemKey);
        if (!config) return null;
        return {
          config,
          stock:         item.stock,
          purchasePrice: Number(item.purchasePrice),
          sellPrice:     Number(item.sellPrice),
          invId:         item.id,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return {
      businessId,
      name:    b.name,
      balance: Number(b.balance),
      isOpen:  b.isOpen,
      stock,
      catalog,
    };
  }

  /** Owner adds or increases stock for a vehicle model. */
  @Rpc('dealership:restock')
  static async restock(
    player: PlayerMp,
    businessId: number,
    itemKey: string,
    qty: number,
    purchasePrice: number,
  ): Promise<{ ok: boolean }> {
    const charId = characterId(player);
    const b = await svc.findOwnedBy(businessId, charId!);
    if (!b && !isAdmin(player)) {
      notify(player).screen.error('You do not own this dealership.');
      return { ok: false };
    }

    if (!b) {
      // admin shortcut — no balance check
      const existing = await svc.getInventoryItem(businessId, itemKey);
      await svc.upsertInventoryItem(
        businessId, itemKey, qty, purchasePrice,
        existing ? Number(existing.sellPrice) : purchasePrice * 1.3,
      );
      notify(player).screen.success(`Restocked ${qty}× ${itemKey}.`);
      return { ok: true };
    }

    const totalCost = purchasePrice * qty;
    const balance   = Number(b.balance);
    if (balance < totalCost) {
      notify(player).screen.error(`Insufficient funds — need $${totalCost.toLocaleString()}, have $${balance.toLocaleString()}.`);
      return { ok: false };
    }

    b.balance = balance - totalCost;
    await b.save();

    const existing = await svc.getInventoryItem(businessId, itemKey);
    await svc.upsertInventoryItem(
      businessId, itemKey, qty, purchasePrice,
      existing ? Number(existing.sellPrice) : purchasePrice * 1.3,
    );

    notify(player).screen.success(`Restocked ${qty}× ${itemKey}.`);
    log.info('[Dealership]', `${player.name} restocked ${qty}× ${itemKey} at #${businessId}`);
    return { ok: true };
  }

  /** Owner updates the sell price for a vehicle model. */
  @Rpc('dealership:setPrice')
  static async setPrice(
    player: PlayerMp,
    businessId: number,
    itemKey: string,
    price: number,
  ): Promise<{ ok: boolean }> {
    const charId = characterId(player);
    const b = await svc.findOwnedBy(businessId, charId!);
    if (!b && !isAdmin(player)) {
      notify(player).screen.error('You do not own this dealership.');
      return { ok: false };
    }
    await svc.setItemSellPrice(businessId, itemKey, price);
    log.info('[Dealership]', `${player.name} set ${itemKey} price → $${price} at #${businessId}`);
    return { ok: true };
  }

  /** Owner removes a vehicle model from the inventory entirely. */
  @Rpc('dealership:removeItem')
  static async removeItem(
    player: PlayerMp,
    businessId: number,
    itemKey: string,
  ): Promise<{ ok: boolean }> {
    const charId = characterId(player);
    const b = await svc.findOwnedBy(businessId, charId!);
    if (!b && !isAdmin(player)) {
      notify(player).screen.error('You do not own this dealership.');
      return { ok: false };
    }
    // Set stock to 0 — keeps history, prevents purchases, owner can restock later
    await svc.setItemSellPrice(businessId, itemKey, 0);

    // Force stock to zero via upsert with qty=0 delta; direct update is cleaner:
    const item = await svc.getInventoryItem(businessId, itemKey);
    if (item) {
      item.stock = 0;
      await item.save();
    }

    log.info('[Dealership]', `${player.name} removed ${itemKey} from #${businessId}`);
    return { ok: true };
  }

  /** Admin-only shortcut: vcat catalog list via RPC (used by CEF manage page). */
  @Rpc('vcat:list')
  static async vcatList(player: PlayerMp): Promise<Awaited<ReturnType<typeof catSvc.getAll>>> {
    if (!isAdmin(player)) return [];
    return catSvc.getAll();
  }

  @Rpc('vcat:upsert')
  static async vcatUpsert(player: PlayerMp, entry: Parameters<typeof catSvc.upsert>[0]): Promise<{ ok: boolean }> {
    if (!isAdmin(player)) return { ok: false };
    await catSvc.upsert(entry);
    return { ok: true };
  }

  @Rpc('vcat:delete')
  static async vcatDelete(player: PlayerMp, model: string): Promise<{ ok: boolean }> {
    if (!isAdmin(player)) return { ok: false };
    const ok = await catSvc.deleteByModel(model);
    return { ok };
  }
}

void DealershipFeature;
