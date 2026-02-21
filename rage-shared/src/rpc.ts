import type { AuthResult, CharacterSummary } from './types/auth';

// Server-side procedures (CEF/Client → Server)
export interface ServerRPCs {
  // Teleport
  'tpm:teleport': (x: number, y: number, z: number) => void;

  // Auth
  'auth:login':    (username: string, password: string) => AuthResult;
  'auth:register': (username: string, password: string) => AuthResult;

  // Character
  'character:getList': () => CharacterSummary[];
  'character:create':  (firstName: string, lastName: string, gender: 'male' | 'female') => CharacterSummary;
  'character:select':  (characterId: number) => AuthResult;
}

// Client/CEF-side procedures (Server → CEF)
export interface ClientRPCs {}
