// ── Player Vehicle DTO ─────────────────────────────────────────────────────
// Minimal snapshot sent to a client to represent one of their own vehicles.
// Fuel and lock state are kept as entity.setVariable on the live MP entity
// so the HUD can read them without RPCs.

export interface PlayerVehicleDto {
  id:             number;
  model:          string;
  plate:          string;
  label:          string;        // from VehicleModelConfig.label
  colorPrimary:   string;        // hex
  colorSecondary: string;        // hex
  fuel:           number;
  odometer:       number;
  engineHealth:   number;
  bodyHealth:     number;
  isLocked:       boolean;
  isParked:       boolean;
  impounded:      boolean;
}
