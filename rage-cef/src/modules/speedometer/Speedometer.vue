<template>
  <div class="speedometer" :class="{ active: store.vehicle.isActive }">

    <!-- Fuel Gauge (small, bottom-left of container) -->
    <div class="fuel-gauge">
      <svg class="arc-svg" viewBox="0 0 100 100">
        <!-- Track -->
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          stroke-width="4"
          stroke-dasharray="140 251"
          stroke-linecap="round"
        />
        <!-- Fill – maps 0–100 fuel to 0–140 arc length -->
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke="#FFC107"
          stroke-width="6"
          :stroke-dasharray="`${fuelArcLength} 251`"
          stroke-linecap="round"
        />
      </svg>
      <!-- Fuel pump icon -->
      <svg class="fuel-icon" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.77 7.23l.01-.01-3.72-3.72-1.06 1.06 2.11 2.11a2.5 2.5 0 0 0-1.6 2.33 2.5 2.5 0 0 0 2.5 2.5c.36 0 .69-.08 1-.21V19c0 .55-.45 1-1 1s-1-.45-1-1v-3c0-1.1-.9-2-2-2H14V5c0-1.1-.9-2-2-2H6C4.9 3 4 3.9 4 5v16h10v-7.5h1.5v5a2.5 2.5 0 0 0 5 0V9c0-.69-.28-1.32-.73-1.77zM19 10c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zM6 5h6v6H6V5z"/>
      </svg>
    </div>

    <!-- Main Speed Gauge -->
    <div class="speed-gauge">
      <svg class="arc-svg" viewBox="0 0 250 250">
        <!-- Background track -->
        <circle
          cx="125" cy="125" r="110"
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          stroke-width="6"
          stroke-dasharray="350 691"
          stroke-linecap="round"
        />
        <!-- Speed fill arc -->
        <circle
          cx="125" cy="125" r="110"
          fill="none"
          stroke="#FFC107"
          stroke-width="12"
          :stroke-dasharray="`${speedArcLength} 691`"
          stroke-linecap="round"
          style="filter: drop-shadow(0 0 6px rgba(255,193,7,0.7));"
        />
      </svg>

      <!-- Speed number + unit -->
      <div class="speed-display">
        <div class="speed-row">
          <h1 class="speed-number">{{ Math.round(store.vehicle.speed) }}</h1>
          <span class="gear-value">{{ gearDisplay }}</span>
        </div>
        <span class="speed-unit">KM/H</span>
      </div>

      <!-- Status icons (two rows) -->
      <div class="status-icons">
        <div class="icon-row">
          <!-- Seatbelt (off / yellow when off) -->
          <svg class="icon" :class="['icon', 'yellow']" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2" />
            <path d="M12 8c-1.1 0-2 .9-2 2v5h4v-5c0-1.1-.9-2-2-2z"/>
            <path d="M8.5 10.5L6 13H9v4h6v-4h3l-2.5-2.5"/>
          </svg>

          <!-- Car icon -->
          <svg class="icon white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.9 6c-.2-.6-.8-1-1.4-1h-11c-.7 0-1.2.4-1.4 1L3 12v8c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-1h12v1c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-8l-2.1-6zM6.5 16c-.8 0-1.5-.7-1.5-1.5S5.7 13 6.5 13s1.5.7 1.5 1.5S7.3 16 6.5 16zm11 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>

          <!-- Engine icon -->
          <svg class="icon" :class="store.vehicle.engine ? 'yellow active-glow' : 'yellow'" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 13v-2h-2V9c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v2H4v2h2v4h12v-4h2zm-4 0H8V9h8v4z"/>
          </svg>
        </div>

        <div class="icon-row">
          <!-- Lights icon -->
          <svg class="icon" :class="store.vehicle.lights ? 'white active-glow' : 'white'" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .6.4 1 1 1h6c.6 0 1-.4 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7zm2.9 11.1l-.9.6V16h-4v-2.3l-.9-.6C7.8 12.2 7 10.6 7 9c0-2.8 2.2-5 5-5s5 2.2 5 5c0 1.6-.8 3.2-2.1 4.1zM10 20h4v1h-4z"/>
          </svg>

          <!-- Lock icon -->
          <svg class="icon" :class="store.vehicle.locked ? 'yellow active-glow' : 'yellow'" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 8h-1V6c0-2.8-2.2-5-5-5S7 3.2 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.7 1.4-3.1 3.1-3.1 1.7 0 3.1 1.4 3.1 3.1v2z"/>
          </svg>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSpeedometerStore } from './speedometer.store';

const store = useSpeedometerStore();

// Speed arc: track total is 350 (stroke-dasharray track), max speed maps to 350
const speedArcLength = computed(() => {
  const pct = Math.min(store.vehicle.speed / store.vehicle.maxSpeed, 1);
  return pct * 350;
});

// Fuel arc: pretend 100% fuel = full 140 arc length (fuel not in store, show static 60%)
const fuelArcLength = computed(() => {
  // fuel is not in the store yet, show placeholder 60%
  return 60;
});

const gearDisplay = computed(() => {
  const g = store.vehicle.gear;
  if (g === 0) return 'N';
  if (g === -1) return 'R';
  return String(g);
});
</script>

<style scoped>
/* ── Wrapper (position on screen) ───────────────────────────────── */
.speedometer {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 360px;
  height: 320px;
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.speedometer.active {
  opacity: 1;
}

/* ── Main Speed Gauge ────────────────────────────────────────────── */
.speed-gauge {
  position: absolute;
  top: 0;
  right: 20px;
  width: 250px;
  height: 250px;
}

.arc-svg {
  width: 100%;
  height: 100%;
  transform: rotate(140deg);
}

/* ── Speed display (center of the big gauge) ─────────────────────── */
.speed-display {
  position: absolute;
  top: 75px;
  left: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.speed-row {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  line-height: 1;
}

.speed-number {
  font-size: 72px;
  font-weight: 600;
  color: #ffffff;
  line-height: 1;
  margin: 0;
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.4);
}

.speed-unit {
  font-size: 16px;
  font-weight: 500;
  color: #d1d1d1;
  letter-spacing: 1.5px;
  margin-top: 4px;
}

.gear-value {
  font-size: 22px;
  font-weight: 700;
  color: #FFC107;
  line-height: 1;
  padding-bottom: 6px;
  text-shadow: 0 0 8px rgba(255, 193, 7, 0.5);
}

/* ── Status icons (two rows inside gauge) ─────────────────────── */
.status-icons {
  position: absolute;
  top: 175px;
  left: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.icon-row {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.icon {
  width: 24px;
  height: 24px;
}

.icon.yellow {
  color: rgba(255, 193, 7, 0.35);
  transition: color 0.2s ease, filter 0.2s ease;
}

.icon.white {
  color: rgba(240, 240, 240, 0.35);
  transition: color 0.2s ease, filter 0.2s ease;
}

.icon.yellow.active-glow {
  color: #FFC107;
  filter: drop-shadow(0 0 6px rgba(255, 193, 7, 0.6));
}

.icon.white.active-glow {
  color: #F0F0F0;
  filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.5));
}

/* ── Fuel Gauge (small, bottom-left) ─────────────────────────── */
.fuel-gauge {
  position: absolute;
  bottom: 20px;
  left: 0;
  width: 100px;
  height: 100px;
}

.fuel-gauge .arc-svg {
  transform: rotate(95deg);
}

.fuel-icon {
  position: absolute;
  top: 38px;
  left: 38px;
  width: 24px;
  height: 24px;
  color: rgba(255, 255, 255, 0.7);
}
</style>
