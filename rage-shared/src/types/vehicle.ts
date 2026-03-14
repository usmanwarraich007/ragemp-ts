export type VehicleState    = 'GARAGED' | 'SPAWNED' | 'IMPOUNDED' | 'DESTROYED';
export type VehicleKeyRole  = 'owner' | 'shared' | 'temporary';

export interface VehicleModelConfigDto {
  model:            string;    // GTA model name e.g. "elegy2"
  label:            string;    // Display name e.g. "Elegy Retro Custom"
  category:         string;    // e.g. "Sports", "Muscle"
  seats:            number;
  basePrice:        number;
  fuelCapacity:     number;    // litres
  fuelConsume:      number;    // litres/min at full throttle
  trunkVolume:      number;    // litres — used by trunk inventory
  gloveboxCapacity: number;    // litres — small in-cabin storage
  repairCost:       number;    // base cost to repair at a mechanic
  insuranceCost:    number;    // periodic insurance fee
  speed:            number;    // 0-100 stat bar
  accel:            number;
  traction:         number;
  brakes:           number;
  colors:           string[];  // hex strings e.g. ["#fff","#333"]
  tags:             string[];  // e.g. ["sports","tunable"]
}

export interface VehicleCosmeticsDto {
  colorPrimary:   string;
  colorSecondary: string;
  colorPearl:     number;
  wheelColor:     number;
  wheelType:      number;
  windowTint:     number;
  livery:         number;
  neonEnabled:    boolean;
  neonColorR:     number;
  neonColorG:     number;
  neonColorB:     number;
  xenonColor:     number;
}

export interface VehicleModDto {
  modType:  number;
  modIndex: number;
}

export interface VehicleKeyDto {
  characterId: number;
  role:        VehicleKeyRole;
}

export interface PlayerVehicleDto {
  id:           number;
  model:        string;
  plate:        string;
  label:        string;
  state:        VehicleState;
  fuel:         number;
  odometer:     number;
  engineHealth: number;
  bodyHealth:   number;
  isLocked:     boolean;
  cosmetics:    VehicleCosmeticsDto;
  mods:         VehicleModDto[];
}
