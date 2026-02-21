/**
 * Shared RPC type contracts.
 *
 * Add your procedures here as the project grows.
 * Both rage-cef and rage-server-client import from this file.
 *
 * Format:
 *   'event:name': (arg1: Type, arg2: Type) => ReturnType
 */

// Server-side procedures (CEF/Client → Server)
export interface ServerRPCs {
  // Teleport to waypoint — called by client after reading blip coords
  'tpm:teleport': (x: number, y: number, z: number) => void;
  // Example:
  // 'auth:login': (username: string, password: string) => { success: boolean; token?: string };
  // 'inventory:getItems': () => { id: number; name: string }[];
}

// Client/CEF-side procedures (Server → CEF)
export interface ClientRPCs {
  // Example:
  // 'ui:confirmDialog': (question: string) => boolean;
}
