/**
 * Cache.ts — Generic in-memory cache for server-side world data.
 *
 * Use this for semi-static, shared data (businesses, item catalog, vehicle shop stock, etc.)
 * that many players request but rarely changes.
 *
 * DO NOT use for per-player data (character, inventory, bank) — use playerStore instead.
 *
 * Usage:
 *   const cache = new Cache<number, Business>();
 *   const all   = await cache.getAll(() => repo.find(), b => b.id);
 *   cache.set(1, updated);
 *   cache.delete(1);
 *
 * For grouped lookups (e.g. inventory keyed by businessId):
 *   const inv = new GroupCache<number, BusinessInventory>();
 *   const items = await inv.getGroup(bizId, () => repo.findBy({ businessId: bizId }));
 *   inv.setGroup(bizId, updatedList);
 *   inv.invalidate(bizId);
 */

// ── Simple cache (all-or-nothing load, keyed by a single value) ───────────────

export class Cache<K, V> {
  private readonly store = new Map<K, V>();
  private populated = false;

  /** Return all cached values, loading from DB on first call. */
  async getAll(loader: () => Promise<V[]>, key: (v: V) => K): Promise<V[]> {
    if (!this.populated) {
      const rows = await loader();
      this.store.clear();
      rows.forEach((v) => this.store.set(key(v), v));
      this.populated = true;
    }
    return [...this.store.values()];
  }

  /** Return a single cached value by key, or undefined. */
  getOne(k: K): V | undefined {
    return this.store.get(k);
  }

  /** Upsert a value into the cache (call after DB insert or update). */
  set(k: K, v: V): void {
    this.store.set(k, v);
    this.populated = true;
  }

  /** Remove a single entry (call after DB delete). */
  delete(k: K): void {
    this.store.delete(k);
  }

  /** Wipe the entire cache — next getAll() will reload from DB. */
  invalidate(): void {
    this.store.clear();
    this.populated = false;
  }

  get size(): number {
    return this.store.size;
  }
}

// ── Group cache (keyed by a group id, value is an array) ─────────────────────
// Useful for: business inventory keyed by businessId, etc.

export class GroupCache<K, V> {
  private readonly store = new Map<K, V[]>();

  /** Return items for a group, loading from DB if not cached. */
  async getGroup(k: K, loader: () => Promise<V[]>): Promise<V[]> {
    if (!this.store.has(k)) {
      this.store.set(k, await loader());
    }
    return this.store.get(k)!;
  }

  /** Replace the cached group (call after restock / price update). */
  setGroup(k: K, items: V[]): void {
    this.store.set(k, items);
  }

  /** Drop a group so it reloads from DB on next access. */
  invalidate(k: K): void {
    this.store.delete(k);
  }

  /** Wipe all groups — use after global resets. */
  invalidateAll(): void {
    this.store.clear();
  }
}
