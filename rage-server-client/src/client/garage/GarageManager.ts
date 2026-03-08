/**
 * GarageManager.ts — Listens to garage sync events and spawns the correct
 * GarageHandler subclass for each garage type received from the server.
 *
 * Add new garage types to the HANDLERS map here.
 */

import type { GarageDto, GarageType } from '@ragemp/shared';
import { GarageHandler }        from './GarageHandler';
import { PublicGarageHandler }  from './handlers/PublicGarageHandler';
import { ApartmentGarageHandler } from './handlers/ApartmentGarageHandler';
import { HouseGarageHandler }   from './handlers/HouseGarageHandler';

// ── Handler registry — add new types here ────────────────────────────────────

const HANDLERS: Partial<Record<GarageType, new (data: GarageDto) => GarageHandler>> = {
  PUBLIC:    PublicGarageHandler,
  APARTMENT: ApartmentGarageHandler,
  HOUSE:     HouseGarageHandler,
};

// ── Manager ───────────────────────────────────────────────────────────────────

class GarageManagerClass {
  private readonly active = new Map<number, GarageHandler>();

  constructor() {
    mp.events.add('garage:sync',   (json: string) => this.onSync(json));
    mp.events.add('garage:add',    (json: string) => this.onAdd(json));
    mp.events.add('garage:remove', (id: number)   => this.onRemove(id));
    mp.events.add('garage:update', (json: string) => this.onUpdate(json));
  }

  private onSync(json: string): void {
    const list = JSON.parse(json) as GarageDto[];
    for (const h of this.active.values()) h.onUnload();
    this.active.clear();
    list.forEach((d) => this.spawn(d));
  }

  private onAdd(json: string): void {
    this.spawn(JSON.parse(json) as GarageDto);
  }

  private onRemove(id: number): void {
    this.active.get(id)?.onUnload();
    this.active.delete(id);
  }

  private onUpdate(json: string): void {
    const patch = JSON.parse(json) as Partial<GarageDto> & { id: number };
    this.active.get(patch.id)?.onUpdate(patch);
  }

  private spawn(data: GarageDto): void {
    const HandlerClass = HANDLERS[data.type];
    if (!HandlerClass) return; // type not yet implemented client-side

    const handler = new HandlerClass(data);
    handler.onLoad();
    this.active.set(data.id, handler);
  }
}

export const garageManager = new GarageManagerClass();
