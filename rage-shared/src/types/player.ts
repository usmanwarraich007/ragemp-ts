// Shared player interfaces
export interface PlayerStats {
  health: number;    // 0–100
  armor: number;     // 0–100
  hunger: number;    // 0–100
  thirst: number;    // 0–100
  isMicActive: boolean;
  isDead: boolean;
  name: string;
  id: number;
}
