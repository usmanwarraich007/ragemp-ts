import { defineStore } from 'pinia';
import { reactive } from 'vue';
import type { SpeedometerData } from '@ragemp/shared';
import { eventBus } from '@/core';

export const useSpeedometerStore = defineStore('speedometer', () => {
  const vehicle = reactive<SpeedometerData>({
    isActive: false,
    speed: 0,
    maxSpeed: 260,
    gear: 0,
    engine: false,
    lights: false,
    locked: false,
  });

  // Listen to per-key updates from the game client
  eventBus.on('hud:setVehicleData', ({ key, data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vehicle as any)[key] = data;
  });

  return { vehicle };
});
