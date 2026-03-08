/**
 * business.service.ts — Shared helper layer for all business feature handlers.
 *
 * Uses Cache<K,V> for businesses+zones (shared world data read by every joining player)
 * and GroupCache<K,V> for per-business inventory (read when player opens store UI).
 *
 * Cache invalidation rules:
 *   - businessCache: invalidated on create, delete, updatePosition
 *   - inventoryCache: invalidated per-businessId on restock, purchase, priceChange
 */

import { AppDataSource } from '../../database/data-source';
import { Business, BusinessInventory, BusinessZone } from './business.entity';
import { Cache, GroupCache } from '../../core/Cache';
import type { BusinessDto, BusinessInventoryItemDto, BusinessType } from '@ragemp/shared';

// ── Repositories ──────────────────────────────────────────────────────────────

const businessRepo  = () => AppDataSource.getRepository(Business);
const inventoryRepo = () => AppDataSource.getRepository(BusinessInventory);
const zoneRepo      = () => AppDataSource.getRepository(BusinessZone);

// ── Caches ────────────────────────────────────────────────────────────────────

type BusinessRow = { business: Business; zones: BusinessZone[] };

/**
 * Shared world cache: all businesses + their zones.
 * Populated once on first player join, invalidated on any structural change.
 * For a server with 50 businesses this is ~5 KB in memory — zero cost.
 */
const businessCache = new Cache<number, BusinessRow>();

/**
 * Per-business inventory cache: keyed by businessId.
 * Loaded lazily the first time a player opens that store's UI.
 * Invalidated on each restock or purchase at that business only.
 */
const inventoryCache = new GroupCache<number, BusinessInventory>();

// ── Mappers ───────────────────────────────────────────────────────────────────

/**
 * Convert a Business + optional zones to a DTO.
 * Pass `zones` to include per-zone positions (required for join sync and setzone broadcasts).
 * Omit for lightweight updates (toggle, setowner) so client doesn't overwrite saved positions.
 */
export function toDto(b: Business, zones?: BusinessZone[]): BusinessDto {
  const dto: BusinessDto = {
    id:      b.id,
    type:    b.type as BusinessType,
    name:    b.name,
    ownerId: b.ownerId,
    isOpen:  b.isOpen,
    x: b.x, y: b.y, z: b.z,
  };
  if (zones !== undefined) {
    const zonesMap: Record<string, { x: number; y: number; z: number }> = {};
    for (const z of zones) zonesMap[z.zoneKey] = { x: z.x, y: z.y, z: z.z };
    dto.zones = zonesMap;
  }
  return dto;
}

export function toInventoryDto(inv: BusinessInventory): BusinessInventoryItemDto {
  return {
    id:            inv.id,
    businessId:    inv.businessId,
    itemKey:       inv.itemKey,
    stock:         inv.stock,
    purchasePrice: Number(inv.purchasePrice),
    sellPrice:     Number(inv.sellPrice),
  };
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Returns all businesses with zones. DB is queried only if cache is empty. */
export async function getAllBusinesses(): Promise<BusinessRow[]> {
  return businessCache.getAll(async () => {
    const businesses = await businessRepo().find();
    const zones      = await zoneRepo().find();
    const zonesByBiz = new Map<number, BusinessZone[]>();
    for (const z of zones) {
      const list = zonesByBiz.get(z.businessId) ?? [];
      list.push(z);
      zonesByBiz.set(z.businessId, list);
    }
    return businesses.map((b) => ({ business: b, zones: zonesByBiz.get(b.id) ?? [] }));
  }, (row) => row.business.id);
}

export async function findById(id: number): Promise<Business | null> {
  // Try cache first, fall back to DB (needed before full cache is populated)
  return businessCache.getOne(id)?.business ?? businessRepo().findOneBy({ id });
}

export async function getZones(businessId: number): Promise<BusinessZone[]> {
  return businessCache.getOne(businessId)?.zones ?? zoneRepo().findBy({ businessId });
}

/** Returns the business only if the given characterId is the owner. */
export async function findOwnedBy(
  businessId: number,
  characterId: number,
): Promise<Business | null> {
  const b = await findById(businessId);
  return b && Number(b.ownerId) === characterId ? b : null;
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createBusiness(
  type: BusinessType,
  name: string,
  x: number, y: number, z: number,
  defaultZones: Array<{ key: string; dx: number; dy: number; dz?: number }> = [],
): Promise<Business> {
  const b = businessRepo().create({ type, name, x, y, z, isOpen: false, balance: 0 });
  await businessRepo().save(b);

  const zones: BusinessZone[] = [];
  for (const { key, dx, dy, dz = 0 } of defaultZones) {
    const zone = zoneRepo().create({ businessId: b.id, zoneKey: key, x: x + dx, y: y + dy, z: z + dz });
    await zoneRepo().save(zone);
    zones.push(zone);
  }

  // Add to cache immediately — no need to invalidate and re-fetch
  businessCache.set(b.id, { business: b, zones });
  return b;
}

export async function updatePosition(
  business: Business,
  x: number, y: number, z: number,
): Promise<void> {
  business.x = x;
  business.y = y;
  business.z = z;
  await businessRepo().save(business);
  // Update cache entry in-place
  const row = businessCache.getOne(business.id);
  if (row) businessCache.set(business.id, { ...row, business });
}

/** Upsert a zone position. Updates cache in-place. */
export async function upsertZone(
  businessId: number,
  zoneKey: string,
  x: number, y: number, z: number,
  heading = 0,
): Promise<void> {
  let zone = await zoneRepo().findOneBy({ businessId, zoneKey });
  if (zone) {
    zone.x = x; zone.y = y; zone.z = z; zone.heading = heading;
  } else {
    zone = zoneRepo().create({ businessId, zoneKey, x, y, z, heading });
  }
  await zoneRepo().save(zone);

  // Update zone in the cache row without full reload
  const row = businessCache.getOne(businessId);
  if (row) {
    const existing = row.zones.findIndex((z) => z.zoneKey === zoneKey);
    if (existing >= 0) row.zones[existing] = zone;
    else row.zones.push(zone);
  }
}

export async function deleteBusiness(id: number): Promise<void> {
  await businessRepo().delete(id);
  businessCache.delete(id);
  inventoryCache.invalidate(id);
}

export async function setOpen(business: Business, isOpen: boolean): Promise<void> {
  business.isOpen = isOpen;
  await businessRepo().save(business);
  // Patch cache entry so findById reflects new state immediately
  const row = businessCache.getOne(business.id);
  if (row) businessCache.set(business.id, { ...row, business });
}

export async function transferOwnership(business: Business, newOwnerId: number): Promise<void> {
  business.ownerId = newOwnerId;
  await businessRepo().save(business);
  const row = businessCache.getOne(business.id);
  if (row) businessCache.set(business.id, { ...row, business });
}

export async function withdraw(
  business: Business,
  amount: number,
): Promise<{ balance: number }> {
  const current = Number(business.balance);
  if (amount > current) throw new Error('Insufficient business funds.');
  business.balance = current - amount;
  await businessRepo().save(business);
  const row = businessCache.getOne(business.id);
  if (row) businessCache.set(business.id, { ...row, business });
  return { balance: Number(business.balance) };
}

// ── Inventory ─────────────────────────────────────────────────────────────────

/** Returns inventory for a business. Cached per-businessId. */
export async function getInventory(businessId: number): Promise<BusinessInventory[]> {
  return inventoryCache.getGroup(businessId, () =>
    inventoryRepo().findBy({ businessId }),
  );
}

export async function getInventoryItem(
  businessId: number,
  itemKey: string,
): Promise<BusinessInventory | null> {
  const items = await getInventory(businessId);
  return items.find((i) => i.itemKey === itemKey) ?? null;
}

export async function upsertInventoryItem(
  businessId: number,
  itemKey: string,
  stock: number,
  purchasePrice: number,
  sellPrice: number,
): Promise<void> {
  let item = await inventoryRepo().findOneBy({ businessId, itemKey });
  if (item) {
    item.stock         += stock;
    item.purchasePrice  = purchasePrice;
    item.sellPrice      = sellPrice;
  } else {
    item = inventoryRepo().create({ businessId, itemKey, stock, purchasePrice, sellPrice });
  }
  await inventoryRepo().save(item);
  // Invalidate so next read fetches fresh from DB
  inventoryCache.invalidate(businessId);
}

export async function setItemSellPrice(
  businessId: number,
  itemKey: string,
  price: number,
): Promise<void> {
  await inventoryRepo().update({ businessId, itemKey }, { sellPrice: price });
  inventoryCache.invalidate(businessId);
}

export async function deductStock(
  businessId: number,
  itemKey: string,
  qty = 1,
): Promise<void> {
  // Read from cache (avoids DB hit)
  const items = await getInventory(businessId);
  const item  = items.find((i) => i.itemKey === itemKey);
  if (!item || item.stock < qty) throw new Error('Out of stock.');
  item.stock -= qty;
  await inventoryRepo().save(item);
  // Update cached list in-place — no invalidate needed, we already mutated the ref
}
