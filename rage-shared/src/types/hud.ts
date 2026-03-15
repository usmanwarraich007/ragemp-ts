// Shared types for HUD data
export interface SpeedometerData {
  isActive: boolean;
  gear: number;
  engine: boolean;
  lights: boolean;
  locked: boolean;
  speed: number;
  maxSpeed: number;
  fuel: number;
  fuelCapacity: number;
}

export interface AreaData {
  area: string;
  street: string;
}

export interface InteractButton {
  button: string;
  time: number;
  image?: string;
  count?: number;
  rarity?: number;
  header: string;
  description: string;
  autoStart: boolean;
}
