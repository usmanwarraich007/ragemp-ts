import type { VehicleState } from '@ragemp/shared';
import type { PlayerVehicle } from './player-vehicle.entity';
import type { VehicleCosmetics } from './vehicle-cosmetics.entity';
import type { VehicleMod } from './vehicle-mods.entity';
import type { VehicleKey } from './vehicle-keys.entity';

export class VehicleRuntime {
  /** Position sampled on the last fuel tick — used to calculate driven distance. */
  lastTickPos: { x: number; y: number; z: number } | null = null;

  /** Maximum fuel the tank can hold (from VehicleModelConfig). */
  fuelCapacity: number;

  constructor(
    public readonly dbRow:    PlayerVehicle,
    public readonly mp:       VehicleMp,
    public cosmetics:         VehicleCosmetics,
    public mods:              VehicleMod[],
    public keys:              VehicleKey[],
    fuelCapacity = 60,
  ) {
    this.fuelCapacity = fuelCapacity;
  }

  get id():    number       { return this.dbRow.id; }
  get model(): string       { return this.dbRow.model; }
  get state(): VehicleState { return this.dbRow.state; }

  setFuel(v: number): void {
    this.dbRow.fuel = Math.max(0, Math.min(this.fuelCapacity, v));
    this.mp.setVariable('fuel', this.dbRow.fuel);
  }

  setLocked(v: boolean): void {
    this.dbRow.isLocked = v;
    this.mp.locked = v;
    this.mp.setVariable('locked', v);
  }

  setHealth(engineHealth: number, bodyHealth: number): void {
    this.dbRow.engineHealth = engineHealth;
    this.dbRow.bodyHealth   = bodyHealth;
    this.mp.setVariable('engineHealth', engineHealth);
    this.mp.setVariable('bodyHealth',   bodyHealth);
  }

  setDirt(v: number): void {
    this.dbRow.dirt = Math.max(0, Math.min(15, v));
    this.mp.setVariable('dirt', this.dbRow.dirt);
  }

  /**
   * Sets the engine on/off state. If turning off due to empty fuel, optionally
   * passes the driver player so the client can display a "out of fuel" notification.
   */
  setEngine(on: boolean, driver?: PlayerMp): void {
    this.mp.setVariable('engineOn', on);
    if (!on && driver) {
      driver.call('vehicle:engineKilled', []);
    }
  }

  hasKey(characterId: number): boolean {
    // If no key rows exist yet (e.g. legacy vehicles), fall back to ownership.
    if (this.keys.length === 0) return this.dbRow.characterId === characterId;
    return this.keys.some((k) => k.characterId === characterId);
  }

  syncPosition(): void {
    const pos = this.mp.position;
    this.dbRow.parkedX         = pos.x;
    this.dbRow.parkedY         = pos.y;
    this.dbRow.parkedZ         = pos.z;
    this.dbRow.parkedHeading   = this.mp.heading;
    this.dbRow.parkedDimension = this.mp.dimension;
  }
}
