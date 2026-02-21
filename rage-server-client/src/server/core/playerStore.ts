import { defaultPlayerData, type PlayerData } from '@ragemp/shared';
import { log } from './logger';

/**
 * Server-side typed player data store.
 *
 * Automatically initialises data on playerJoin and cleans up on playerQuit.
 *
 * Usage:
 *   playerStore.get(player)                           // PlayerData
 *   playerStore.set(player, 'account', { ... })       // update one field
 *   playerStore.patch(player, { isLoggedIn: true })   // update multiple fields
 */

const store = new Map<number, PlayerData>();

function get(player: PlayerMp): PlayerData {
  let data = store.get(player.id);
  if (!data) {
    data = defaultPlayerData();
    store.set(player.id, data);
  }
  return data;
}

function set<K extends keyof PlayerData>(player: PlayerMp, key: K, value: PlayerData[K]): void {
  get(player)[key] = value;
}

function patch(player: PlayerMp, partial: Partial<PlayerData>): void {
  Object.assign(get(player), partial);
}

function remove(player: PlayerMp): void {
  store.delete(player.id);
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

mp.events.add('playerJoin', (player: PlayerMp) => {
  store.set(player.id, defaultPlayerData());
  log.info('[PlayerStore]', `Initialised data for ${player.name} (id: ${player.id})`);
});

mp.events.add('playerQuit', (player: PlayerMp) => {
  store.delete(player.id);
  log.info('[PlayerStore]', `Cleaned up data for ${player.name} (id: ${player.id})`);
});

export const playerStore = { get, set, patch, remove };
