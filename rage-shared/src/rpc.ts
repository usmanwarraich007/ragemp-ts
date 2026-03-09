import type { AuthResult, CharacterSummary, CharacterAppearance } from './types/auth';
import type { BusinessDto, BusinessInventoryItemDto, VehicleModelConfigDto, DealershipStockItemDto, DealershipManageDto } from './types/business';
import type { PlayerVehicleDto } from './types/vehicle';
import type { GarageDto, GarageVehicleDto } from './types/garage';
import type { ChatMode } from './types/chat';

// Server-side procedures (CEF/Client → Server)
export interface ServerRPCs {
  // Teleport
  'tpm:teleport': (x: number, y: number, z: number) => void;

  // Chat
  /** Main chat entry point — all T-key text from CEF routes here. */
  'chat:sendMessage': (mode: ChatMode, text: string) => { ok: boolean; error?: string };
  /** Fire any registered @Command from CEF (e.g. /tpm, /veh, /aveh). */
  'chat:command': (rawInput: string) => { ok: boolean; error?: string };

  // Auth
  'auth:login':    (username: string, password: string) => AuthResult;
  'auth:register': (username: string, password: string, email: string) => AuthResult;

  // Character
  'character:getList':        () => CharacterSummary[];
  'character:create':         (firstName: string, lastName: string, gender: 'male' | 'female', appearance: CharacterAppearance) => CharacterSummary;
  'character:select':         (characterId: number) => AuthResult;
  'character:saveAppearance': (characterId: number, appearance: CharacterAppearance) => AuthResult;

  // Vehicles — all door/trunk toggling goes through one RPC (doorIndex 5 = trunk)
  // currentlyOpen = actual door angle state read on the client via getDoorAngleRatio
  'vehicle:door:toggle': (vehicleRemoteId: number, doorIndex: number, currentlyOpen: boolean) => { isOpen: boolean };

  // Vehicle state — engine + lock (initiated by key bindings on the client)
  'vehicle:setEngine':   (vehicleRemoteId: number, on: boolean) => { ok: boolean };
  'vehicle:toggleLock':  (vehicleRemoteId: number) => { locked: boolean };

  // Business — core
  'business:getAll':  () => BusinessDto[];
  'business:toggle':  (businessId: number) => { isOpen: boolean };
  'business:transfer':(businessId: number, targetCharacterId: number) => { ok: boolean };
  'business:withdraw':(businessId: number, amount: number) => { balance: number };

  // Vehicle Catalog (admin)
  'vcat:list':   () => VehicleModelConfigDto[];
  'vcat:upsert': (entry: VehicleModelConfigDto) => { ok: boolean };
  'vcat:delete': (model: string) => { ok: boolean };

  // Player Vehicles
  'vehicle:myVehicles': () => PlayerVehicleDto[];

  // Dealership — customer
  'dealership:getStock':      (businessId: number) => DealershipStockItemDto[];
  'dealership:buyVehicle':    (businessId: number, itemKey: string, colorHex: string) => { ok: boolean; message?: string };
  'dealership:enterShowcase': (businessId: number) => { ok: boolean };
  'dealership:changePreview': (model: string, colorHex: string) => void;
  'dealership:exitShowcase':  () => void;

  // Dealership — owner management
  'dealership:getManageData': (businessId: number) => DealershipManageDto;
  'dealership:restock':       (businessId: number, itemKey: string, qty: number, purchasePrice: number) => { ok: boolean };
  'dealership:setPrice':      (businessId: number, itemKey: string, price: number) => { ok: boolean };
  'dealership:removeItem':    (businessId: number, itemKey: string) => { ok: boolean };

  // Garage
  'garage:getVehicles': (garageId: number) => GarageVehicleDto[];
  'garage:retrieve':    (garageId: number, playerVehicleId: number) => { ok: boolean; message?: string };
  'garage:park':        (garageId: number) => { ok: boolean; fee: number; message?: string };
}

// Client/CEF-side procedures (Server → CEF, initiated by the server)
// Add entries here as server-push RPCs are needed.
// Example:
//   'bank:balanceUpdated': (newBalance: number) => void;
export interface ClientRPCs {}
