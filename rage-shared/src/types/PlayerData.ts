// Shared player data shape — imported by server, CEF, and client for type safety.

export interface AccountData {
  id: number;
  username: string;
  /** 0 = player, 1 = mod, 2 = admin, 3 = superadmin */
  adminLevel: number;
}

export interface CharacterData {
  id: number;
  name: string;
  cash: number;
  bank: number;
  job: string | null;
}

/**
 * Runtime data attached to every connected player on the server.
 * Access via `playerStore.get(player)`.
 */
export interface PlayerData {
  account: AccountData | null;
  character: CharacterData | null;
  isLoggedIn: boolean;
}

/** Returns a fresh default PlayerData (logged-out state). */
export function defaultPlayerData(): PlayerData {
  return {
    account: null,
    character: null,
    isLoggedIn: false,
  };
}
