import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { eventBus } from '@/core';
import type { PlayerStats } from '@ragemp/shared';

/**
 * Pinia store for the stat-rings HUD panel.
 * Driven by the same 'player:setStats' event as the rest of the player HUD.
 */
export const useStatRingsStore = defineStore('stat-rings', () => {
  const stats = reactive<Pick<PlayerStats, 'health' | 'armor' | 'hunger' | 'thirst' | 'isMicActive'>>({
    health:      100,
    armor:       0,
    hunger:      100,
    thirst:      100,
    isMicActive: false,
  });

  eventBus.on('player:setStats', (payload) => {
    stats.health      = payload.health      ?? stats.health;
    stats.armor       = payload.armor       ?? stats.armor;
    stats.hunger      = payload.hunger      ?? stats.hunger;
    stats.thirst      = payload.thirst      ?? stats.thirst;
    stats.isMicActive = payload.isMicActive ?? stats.isMicActive;
  });

  return { stats };
});
