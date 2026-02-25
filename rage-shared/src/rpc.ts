import type { AuthResult, CharacterSummary, CharacterAppearance } from './types/auth';

// Server-side procedures (CEF/Client → Server)
export interface ServerRPCs {
  // Teleport
  'tpm:teleport': (x: number, y: number, z: number) => void;

  // Auth
  'auth:login':    (username: string, password: string) => AuthResult;
  'auth:register': (username: string, password: string) => AuthResult;

  // Character
  'character:getList':       () => CharacterSummary[];
  'character:create':        (firstName: string, lastName: string, gender: 'male' | 'female', appearance: CharacterAppearance) => CharacterSummary;
  'character:select':        (characterId: number) => AuthResult;
  'character:saveAppearance':(characterId: number, appearance: CharacterAppearance) => AuthResult;

  // Vehicles — all door/trunk toggling goes through one RPC (doorIndex 5 = trunk)
  'vehicle:door:toggle':  (vehicleRemoteId: number, doorIndex: number) => { isOpen: boolean };
}

// Client/CEF-side procedures (Server → CEF)
export interface ClientRPCs {}
