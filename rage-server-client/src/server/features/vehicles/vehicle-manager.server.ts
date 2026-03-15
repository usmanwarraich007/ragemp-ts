import { log } from '../../core';
import { VehicleRuntime } from './vehicle-runtime';
import { PlayerVehicle } from './player-vehicle.entity';
import * as pvSvc from './player-vehicle.service';
import * as cosmeticsSvc from './vehicle-cosmetics.service';
import * as modsSvc from './vehicle-mods.service';
import * as keysSvc from './vehicle-keys.service';
import * as configSvc from './vehicle-model-config.service';

type SpawnPosition = { x: number; y: number; z: number; heading: number };

class VehicleManagerClass {
  private byDbId = new Map<number, VehicleRuntime>();
  private byMpId = new Map<number, VehicleRuntime>();

  // ── Internal spawn ────────────────────────────────────────────────────────

  private async spawnInternal(
    dbVehicle: PlayerVehicle,
    pos: SpawnPosition,
  ): Promise<VehicleRuntime> {
    if (this.byDbId.has(dbVehicle.id)) return this.byDbId.get(dbVehicle.id)!;

    const [cosmetics, mods, keys, config] = await Promise.all([
      cosmeticsSvc.findByVehicle(dbVehicle.id),
      modsSvc.findByVehicle(dbVehicle.id),
      keysSvc.findKeysForVehicle(dbVehicle.id),
      configSvc.findByModel(dbVehicle.model),
    ]);

    const mpVeh = mp.vehicles.new(mp.joaat(dbVehicle.model), new mp.Vector3(pos.x, pos.y, pos.z), {
      heading:     pos.heading,
      numberPlate: dbVehicle.plate,
      dimension:   dbVehicle.parkedDimension,
      alpha:       255,
      locked:      dbVehicle.isLocked,
    });

    mpVeh.setVariable('dbId',          dbVehicle.id);
    mpVeh.setVariable('fuel',          dbVehicle.fuel);
    mpVeh.setVariable('fuelCapacity',  config?.fuelCapacity ?? 60);
    mpVeh.setVariable('locked',        dbVehicle.isLocked);
    mpVeh.setVariable('engineOn',      false);

    if (cosmetics) cosmeticsSvc.applyToVariables(cosmetics, mpVeh);
    modsSvc.applyToVariable(mods, mpVeh);

    dbVehicle.state = 'SPAWNED';

    const runtime = new VehicleRuntime(dbVehicle, mpVeh, cosmetics!, mods, keys, config?.fuelCapacity ?? 60);
    this.byDbId.set(dbVehicle.id, runtime);
    this.byMpId.set(mpVeh.id,     runtime);

    log.info('[VehicleManager]', `Spawned ${dbVehicle.model} #${dbVehicle.id} (plate: ${dbVehicle.plate})`);
    return runtime;
  }

  // ── Public API — lifecycle ────────────────────────────────────────────────

  async spawn(dbId: number, pos: SpawnPosition): Promise<VehicleRuntime | null> {
    const dbVehicle = await pvSvc.findById(dbId);
    if (!dbVehicle) return null;
    return this.spawnInternal(dbVehicle, pos);
  }

  async spawnFromGarage(vehicleId: number, pos: SpawnPosition): Promise<VehicleRuntime | null> {
    const dbVehicle = await pvSvc.findById(vehicleId);
    if (!dbVehicle || dbVehicle.state !== 'GARAGED') return null;
    dbVehicle.garageId = null;
    return this.spawnInternal(dbVehicle, pos);
  }

  async despawn(dbId: number): Promise<void> {
    const runtime = this.byDbId.get(dbId);
    if (!runtime) return;
    runtime.syncPosition();
    await Promise.all([
      pvSvc.save(runtime.dbRow),
      runtime.cosmetics ? cosmeticsSvc.save(runtime.cosmetics) : Promise.resolve(),
    ]);
    runtime.mp.destroy();
    this.byDbId.delete(dbId);
    this.byMpId.delete(runtime.mp.id);
    log.info('[VehicleManager]', `Despawned vehicle db#${dbId}`);
  }

  async storeToGarage(dbId: number, garageId: number): Promise<void> {
    const runtime = this.byDbId.get(dbId);
    if (!runtime) return;
    runtime.dbRow.state    = 'GARAGED';
    runtime.dbRow.garageId = garageId;
    runtime.syncPosition();
    await Promise.all([
      pvSvc.save(runtime.dbRow),
      runtime.cosmetics ? cosmeticsSvc.save(runtime.cosmetics) : Promise.resolve(),
    ]);
    runtime.mp.destroy();
    this.byDbId.delete(dbId);
    this.byMpId.delete(runtime.mp.id);
  }

  async impound(dbId: number): Promise<void> {
    const runtime = this.byDbId.get(dbId);
    if (!runtime) return;
    runtime.dbRow.state    = 'IMPOUNDED';
    runtime.dbRow.garageId = null;
    runtime.syncPosition();
    await pvSvc.save(runtime.dbRow);
    runtime.mp.destroy();
    this.byDbId.delete(dbId);
    this.byMpId.delete(runtime.mp.id);
  }

  async release(dbId: number, pos: SpawnPosition): Promise<VehicleRuntime | null> {
    const dbVehicle = await pvSvc.findById(dbId);
    if (!dbVehicle || dbVehicle.state !== 'IMPOUNDED') return null;
    return this.spawnInternal(dbVehicle, pos);
  }

  // ── Public API — creation ─────────────────────────────────────────────────

  async createVehicle(
    charId:          number,
    model:           string,
    plate:           string,
    colorPrimaryHex: string,
    colorSecondaryHex?: string,
  ): Promise<PlayerVehicle> {
    const config     = await configSvc.findByModel(model);
    const dbVehicle  = await pvSvc.createVehicle(charId, model, plate, config!.fuelCapacity);
    await Promise.all([
      cosmeticsSvc.create(dbVehicle.id, {
        colorPrimary:   colorPrimaryHex,
        colorSecondary: colorSecondaryHex ?? colorPrimaryHex,
      }),
      keysSvc.createOwnerKey(dbVehicle.id, charId),
    ]);
    return dbVehicle;
  }

  // ── Public API — lookups ──────────────────────────────────────────────────

  getRuntime(dbId: number): VehicleRuntime | null {
    return this.byDbId.get(dbId) ?? null;
  }

  getRuntimeByMp(vehicleMp: VehicleMp): VehicleRuntime | null {
    return this.byMpId.get(vehicleMp.id) ?? null;
  }

  /** Returns a snapshot of all currently live vehicle runtimes (used by fuel tick). */
  getAllRuntimes(): VehicleRuntime[] {
    return [...this.byDbId.values()];
  }

  async findVehicle(dbId: number): Promise<PlayerVehicle | null> {
    return pvSvc.findById(dbId);
  }

  async getVehiclesForCharacter(charId: number): Promise<PlayerVehicle[]> {
    return pvSvc.findByCharacter(charId);
  }

  async getGaragedVehicles(garageId: number, charId: number): Promise<PlayerVehicle[]> {
    return pvSvc.findGaraged(garageId, charId);
  }

  // ── Public API — persistence ──────────────────────────────────────────────

  async saveAll(): Promise<void> {
    const runtimes = [...this.byDbId.values()];
    await Promise.all(
      runtimes.flatMap((r) => [
        pvSvc.save(r.dbRow),
        r.cosmetics ? cosmeticsSvc.save(r.cosmetics) : Promise.resolve(),
      ]),
    );
  }
}

export const vehicleManager = new VehicleManagerClass();
