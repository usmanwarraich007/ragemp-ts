// ── Garage Types ────────────────────────────────────────────────────────────

export type GarageType = 'PUBLIC' | 'APARTMENT' | 'HOUSE';

/**
 * Snapshot of a garage sent to all clients on spawn.
 * zones: per-zone world positions keyed by zone name (e.g. 'entrance', 'spawn').
 */
export interface GarageDto {
  id:       number;
  type:     GarageType;
  name:     string;
  parkFee:  number;
  x: number; y: number; z: number;
  zones?: Record<string, { x: number; y: number; z: number }>;
}

/**
 * A single vehicle stored in a garage, returned by garage:getVehicles.
 * Only vehicles with garageId = this garage are ever included.
 */
export interface GarageVehicleDto {
  playerVehicleId: number;
  label:           string;   // friendly model name e.g. "Elegy Retro"
  plate:           string;
  engineHealth:    number;   // 0–1000
  fuel:            number;   // 0–100
}
