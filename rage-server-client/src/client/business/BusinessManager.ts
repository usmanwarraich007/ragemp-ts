/**
 * BusinessManager.ts — Singleton that spawns and despawns BusinessHandlers
 * in response to server sync events.
 *
 * Events consumed:
 *   business:sync   — array of all businesses (sent on spawn)
 *   business:add    — a new business was created while online
 *   business:remove — a business was deleted while online
 *   business:update — isOpen / name / ownerId changed
 */

import type { BusinessDto, BusinessType } from '@ragemp/shared';
import { BusinessHandler } from './BusinessHandler';
import { DealershipHandler } from './handlers/DealershipHandler';
import { Store247Handler } from './handlers/Store247Handler';


// ── Handler registry — add new types here ────────────────────────────────────

const HANDLERS: Partial<Record<BusinessType, new (data: BusinessDto) => BusinessHandler>> = {
  DEALERSHIP: DealershipHandler,
  STORE_247:  Store247Handler,
  // CLOTHING:   ClothingHandler,
  // PROPERTY:   PropertyHandler,
};


// ── Manager ───────────────────────────────────────────────────────────────────

class BusinessManagerClass {
  private readonly active = new Map<number, BusinessHandler>();

  constructor() {
    mp.events.add('business:sync',   (json: string) => this.onSync(json));
    mp.events.add('business:add',    (json: string) => this.onAdd(json));
    mp.events.add('business:remove', (id: number)   => this.onRemove(id));
    mp.events.add('business:update', (json: string) => this.onUpdate(json));
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  private onSync(json: string): void {
    const list = JSON.parse(json) as BusinessDto[];
    // Clear any stale handlers (e.g. on character swap)
    for (const h of this.active.values()) h.onUnload();
    this.active.clear();
    list.forEach((d) => this.spawn(d));
  }

  private onAdd(json: string): void {
    this.spawn(JSON.parse(json) as BusinessDto);
  }

  private onRemove(id: number): void {
    this.active.get(id)?.onUnload();
    this.active.delete(id);
  }

  private onUpdate(json: string): void {
    const patch = JSON.parse(json) as Partial<BusinessDto> & { id: number };
    this.active.get(patch.id)?.onUpdate(patch);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private spawn(data: BusinessDto): void {
    const HandlerClass = HANDLERS[data.type];
    if (!HandlerClass) return; // type not yet implemented client-side

    const handler = new HandlerClass(data);
    handler.onLoad();
    this.active.set(data.id, handler);
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────
export const businessManager = new BusinessManagerClass();
