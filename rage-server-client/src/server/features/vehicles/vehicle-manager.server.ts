/**
 * vehicle-manager.server.ts — Singleton that bridges PlayerVehicle DB rows
 * with live RAGE:MP VehicleMp entities.
 *
 * ⚠️ RAGE:MP SERVER-SIDE API NOTE:
 * The server VehicleMp object is intentionally thin. Visual methods like
 * setMod(), setColorRGB(), setNeonEnabled() are CLIENT-side natives only.
 *
 * The correct pattern for this architecture:
 *   Server: sets shared variables (setVariable) on spawn.
 *   Client: streams the vehicle in, reads the variables, applies visuals via natives.
 *
 * This manager:
 *  - Spawns vehicles with position / plate / lock state
 *  - Sets all DB state as shared variables so every client stream-in can apply them
 *  - Saves live state back to DB before despawning
 *  - Provides lookups: dbId → VehicleMp and VehicleMp → PlayerVehicle DB row
 */

import { log } from '../../core';
import { PlayerVehicle } from './player-vehicle.entity';
import * as pvSvc from './player-vehicle.service';

// ── Manager ───────────────────────────────────────────────────────────────────

class VehicleManagerClass {
  /** dbId → live VehicleMp entity */
  private byDbId = new Map<number, VehicleMp>();
  /** VehicleMp.id (RAGEMP net id) → PlayerVehicle DB row */
  private byMpId = new Map<number, PlayerVehicle>();

  // ── Spawn ─────────────────────────────────────────────────────────────────

  /**
   * Spawns a PlayerVehicle DB row as a live RAGE:MP entity.
   *
   * All visual state (colors, mods, neon, tint) is written as shared variables.
   * The client-side vehicle stream script reads them on `entityStreamIn` and
   * applies the actual natives.
   */
  spawn(
    dbVehicle: PlayerVehicle,
    overrides?: { x?: number; y?: number; z?: number; heading?: number },
  ): VehicleMp {
    if (this.byDbId.has(dbVehicle.id)) {
      return this.byDbId.get(dbVehicle.id)!;
    }

    const pos = new mp.Vector3(
      overrides?.x       ?? dbVehicle.parkedX,
      overrides?.y       ?? dbVehicle.parkedY,
      overrides?.z       ?? dbVehicle.parkedZ,
    );

    const vehicle = mp.vehicles.new(mp.joaat(dbVehicle.model), pos, {
      heading:     overrides?.heading ?? dbVehicle.parkedHeading,
      numberPlate: dbVehicle.plate,
      dimension:   dbVehicle.parkedDimension,
      alpha:       255,
      locked:      dbVehicle.isLocked,
    });

    // ── Shared variables — all clients read these on vehicle stream-in ─────
    // Identity
    vehicle.setVariable('dbId',   dbVehicle.id);

    // State (HUD + lock)
    vehicle.setVariable('fuel',     dbVehicle.fuel);
    vehicle.setVariable('locked',   dbVehicle.isLocked);
    vehicle.setVariable('engineOn', false); // always starts off — driver must start manually

    // Visuals — client applies these via natives in entityStreamIn
    vehicle.setVariable('colorPrimary',   dbVehicle.colorPrimary);   // hex
    vehicle.setVariable('colorSecondary', dbVehicle.colorSecondary); // hex
    vehicle.setVariable('colorPearl',     dbVehicle.colorPearl);
    vehicle.setVariable('wheelType',      dbVehicle.wheelType);
    vehicle.setVariable('windowTint',     dbVehicle.windowTint);
    vehicle.setVariable('neonEnabled',    dbVehicle.neonEnabled);
    vehicle.setVariable('neonColor',      dbVehicle.neonColor);      // hex
    vehicle.setVariable('mods',           dbVehicle.mods);           // JSON string

    // Register in maps
    this.byDbId.set(dbVehicle.id, vehicle);
    this.byMpId.set(vehicle.id,   dbVehicle);

    log.info('[VehicleManager]', `Spawned ${dbVehicle.model} #${dbVehicle.id} (plate: ${dbVehicle.plate})`);
    return vehicle;
  }

  // ── Despawn ───────────────────────────────────────────────────────────────

  /**
   * Saves current live state back to DB, destroys entity, cleans up maps.
   */
  async despawn(dbId: number): Promise<void> {
    const vehicle = this.byDbId.get(dbId);
    if (!vehicle) return;

    const dbVehicle = this.byMpId.get(vehicle.id);
    if (dbVehicle) {
      dbVehicle.fuel     = Number(vehicle.getVariable('fuel')    ?? dbVehicle.fuel);
      dbVehicle.isLocked = Boolean(vehicle.getVariable('locked') ?? true);
      dbVehicle.isParked = true;

      const pos = vehicle.position;
      dbVehicle.parkedX         = pos.x;
      dbVehicle.parkedY         = pos.y;
      dbVehicle.parkedZ         = pos.z;
      dbVehicle.parkedHeading   = vehicle.heading;
      dbVehicle.parkedDimension = vehicle.dimension;

      await pvSvc.save(dbVehicle);
    }

    vehicle.destroy();
    this.byDbId.delete(dbId);
    if (dbVehicle) this.byMpId.delete(vehicle.id);

    log.info('[VehicleManager]', `Despawned vehicle db#${dbId}`);
  }

  // ── Lookups ───────────────────────────────────────────────────────────────

  getByDbId(dbId: number): VehicleMp | null {
    return this.byDbId.get(dbId) ?? null;
  }

  getDbRow(vehicleMp: VehicleMp): PlayerVehicle | null {
    return this.byMpId.get(vehicleMp.id) ?? null;
  }

  isLive(dbId: number): boolean {
    return this.byDbId.has(dbId);
  }

  /** Update fuel shared variable and the in-memory DB row ref. */
  setFuel(dbId: number, fuel: number): void {
    const vehicle = this.byDbId.get(dbId);
    if (vehicle) vehicle.setVariable('fuel', Math.max(0, fuel));

    const dbVehicle = vehicle ? this.byMpId.get(vehicle.id) : null;
    if (dbVehicle) dbVehicle.fuel = Math.max(0, fuel);
  }

  /** Toggle lock state, sync shared variable, update in-memory DB row. */
  setLocked(dbId: number, locked: boolean): void {
    const vehicle = this.byDbId.get(dbId);
    if (vehicle) {
      vehicle.locked = locked;
      vehicle.setVariable('locked', locked);
    }
    const dbVehicle = vehicle ? this.byMpId.get(vehicle.id) : null;
    if (dbVehicle) dbVehicle.isLocked = locked;
  }

  /** Update a visual variable and persist to in-memory row (save on despawn). */
  setVisual(dbId: number, key: string, value: unknown): void {
    const vehicle = this.byDbId.get(dbId);
    if (vehicle) vehicle.setVariable(key, value);
  }

  /** Toggle engine state shared variable. */
  setEngine(dbId: number, on: boolean): void {
    const vehicle = this.byDbId.get(dbId);
    if (vehicle) vehicle.setVariable('engineOn', on);
  }

  /**
   * Saves the live vehicle's current world position to the DB row without
   * despawning the entity. Used on player exit and periodic checkpoints.
   * Does NOT mark the vehicle as parked — it's still active on the map.
   */
  async savePosition(vehicleMp: VehicleMp): Promise<void> {
    const dbVehicle = this.byMpId.get(vehicleMp.id);
    if (!dbVehicle) return; // unmanaged vehicle

    const pos                 = vehicleMp.position;
    dbVehicle.parkedX         = pos.x;
    dbVehicle.parkedY         = pos.y;
    dbVehicle.parkedZ         = pos.z;
    dbVehicle.parkedHeading   = vehicleMp.heading;
    dbVehicle.parkedDimension = vehicleMp.dimension;

    log.info('[VehicleManager]', `Saved position for db#${dbVehicle.id}: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`);
    await pvSvc.save(dbVehicle);
  }
  /** Update dirt level shared variable (0.0 = clean, 15.0 = filthy). */
  setDirt(dbId: number, level: number): void {
    const clamped = Math.max(0, Math.min(15, level));
    const vehicle = this.byDbId.get(dbId);
    if (vehicle) vehicle.setVariable('dirt', clamped);

    const dbVehicle = vehicle ? this.byMpId.get(vehicle.id) : null;
    if (dbVehicle) dbVehicle.dirt = clamped;
  }

  /** Update engine and body health shared variables and in-memory DB row. */
  setHealth(dbId: number, engineHealth: number, bodyHealth: number): void {
    const vehicle = this.byDbId.get(dbId);
    if (vehicle) {
      vehicle.setVariable('engineHealth', engineHealth);
      vehicle.setVariable('bodyHealth',   bodyHealth);
    }
    const dbVehicle = vehicle ? this.byMpId.get(vehicle.id) : null;
    if (dbVehicle) {
      dbVehicle.engineHealth = engineHealth;
      dbVehicle.bodyHealth   = bodyHealth;
    }
  }
}

export const vehicleManager = new VehicleManagerClass();
