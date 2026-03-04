import type { AuthResult, CharacterSummary, CharacterAppearance } from './types/auth';
import type { BusinessDto, BusinessInventoryItemDto } from './types/business';

// Server-side procedures (CEF/Client → Server)
export interface ServerRPCs {
  // Teleport
  'tpm:teleport': (x: number, y: number, z: number) => void;

  // Auth
  'auth:login':    (username: string, password: string) => AuthResult;
  'auth:register': (username: string, password: string, email: string) => AuthResult;

  // Character
  'character:getList':        () => CharacterSummary[];
  'character:create':         (firstName: string, lastName: string, gender: 'male' | 'female', appearance: CharacterAppearance) => CharacterSummary;
  'character:select':         (characterId: number) => AuthResult;
  'character:saveAppearance': (characterId: number, appearance: CharacterAppearance) => AuthResult;

  // Vehicles — all door/trunk toggling goes through one RPC (doorIndex 5 = trunk)
  'vehicle:door:toggle': (vehicleRemoteId: number, doorIndex: number) => { isOpen: boolean };

  // Business — core
  'business:getAll':  () => BusinessDto[];
  'business:toggle':  (businessId: number) => { isOpen: boolean };
  'business:transfer':(businessId: number, targetCharacterId: number) => { ok: boolean };
  'business:withdraw':(businessId: number, amount: number) => { balance: number };

  // Dealership
  'dealership:getStock':   (businessId: number) => BusinessInventoryItemDto[];
  'dealership:buyVehicle': (businessId: number, itemKey: string) => { ok: boolean; message?: string };
  'dealership:setPrice':   (businessId: number, itemKey: string, price: number) => { ok: boolean };
  'dealership:restock':    (businessId: number, itemKey: string, quantity: number, purchasePrice: number) => { ok: boolean };
}

// Client/CEF-side procedures (Server → CEF, initiated by the server)
// Add entries here as server-push RPCs are needed.
// Example:
//   'bank:balanceUpdated': (newBalance: number) => void;
export interface ClientRPCs {}
