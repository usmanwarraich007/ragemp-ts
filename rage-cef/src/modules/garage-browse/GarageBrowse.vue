<template>
  <div class="gb-root" tabindex="-1" @keydown.esc="close" ref="rootEl">

    <!-- Right-side panel (matches garage1.html layout) -->
    <div class="side-panel">

      <!-- Header -->
      <div class="header-group">
        <div class="garage-header">
          <div class="title-main">{{ garageName }}<br />GARAGE</div>
          <div class="title-sub">Select a vehicle to retrieve</div>
        </div>

        <!-- Vehicle list -->
        <div class="vehicle-list">
          <div
            v-for="v in vehicles"
            :key="v.playerVehicleId"
            class="vehicle-card"
            :class="{ active: selected?.playerVehicleId === v.playerVehicleId }"
            @click="select(v)"
          >
            <div class="v-info">
              <span class="v-name">{{ v.label }}</span>
              <span class="v-plate">Plate: {{ v.plate }}</span>
            </div>
          </div>

          <div v-if="vehicles.length === 0" class="gb-empty">
            No vehicles stored in this garage.
          </div>
        </div>
      </div>

      <!-- Action area (always visible at bottom) -->
      <div class="action-area">
        <div class="details-box" v-if="selected">
          <div class="detail-row">
            <span>Engine Condition</span>
            <span class="detail-val">{{ enginePct }}%</span>
          </div>
          <div class="detail-row">
            <span>Fuel Level</span>
            <span class="detail-val">{{ fuelPct }}%</span>
          </div>
        </div>
        <div class="details-box placeholder-details" v-else>
          <div class="detail-row">
            <span>Engine Condition</span>
            <span class="detail-val">—</span>
          </div>
          <div class="detail-row">
            <span>Fuel Level</span>
            <span class="detail-val">—</span>
          </div>
        </div>

        <button
          class="btn-retrieve"
          :disabled="!selected || retrieving"
          @click="retrieve"
        >
          <span v-if="retrieving">Processing…</span>
          <span v-else-if="!selected">Select a Vehicle</span>
          <span v-else>Retrieve Vehicle</span>
        </button>
      </div>
    </div>

    <!-- Close hint -->
    <button class="gb-close" @click="close">✕ CLOSE</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { rpc } from '@/core';
import type { GarageVehicleDto } from '@ragemp/shared';

interface PageData {
  garageId: number;
  garageName?: string;
  vehicles: GarageVehicleDto[];
}

const props = defineProps<{ data?: PageData }>();

const garageId   = props.data?.garageId   ?? 0;
const garageName = props.data?.garageName ?? 'PUBLIC';
const vehicles   = ref<GarageVehicleDto[]>(props.data?.vehicles ?? []);
const selected   = ref<GarageVehicleDto | null>(null);
const retrieving = ref(false);

// Auto-select first vehicle
onMounted(() => {
  if (vehicles.value.length > 0) selected.value = vehicles.value[0];
});

const enginePct = computed(() =>
  selected.value ? Math.round((selected.value.engineHealth / 1000) * 100) : 0,
);
const fuelPct = computed(() =>
  selected.value ? Math.round(selected.value.fuel) : 0,
);

function select(v: GarageVehicleDto) {
  selected.value = v;
}

async function retrieve() {
  if (!selected.value || retrieving.value) return;
  retrieving.value = true;
  try {
    const res = await rpc.callServer('garage:retrieve', garageId, selected.value.playerVehicleId);
    if (res?.ok) {
      window.mp?.trigger('cmd:hidePage');
    } else {
      // On failure just re-enable the button — server sends a chat notification
      retrieving.value = false;
    }
  } catch {
    retrieving.value = false;
  }
}

function close() {
  window.mp?.trigger('cmd:hidePage');
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@300;400;600&display=swap');

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Full-screen backdrop — right-side fade matching garage1.html */
.gb-root {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  background: linear-gradient(to left, rgba(0, 0, 0, 0.9) 0%, transparent 40%);
  font-family: 'Inter', sans-serif;
  color: #fff;
  overflow: hidden;
}

/* ── Side panel ──────────────────────────────────────────────────────── */
.side-panel {
  width: 480px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 80px 60px;
  z-index: 10;
}

.header-group {
  display: flex;
  flex-direction: column;
  gap: 40px;
  flex: 1;
  min-height: 0;
}

/* ── Header ──────────────────────────────────────────────────────────── */
.garage-header {
  font-family: 'Oswald', sans-serif;
  text-transform: uppercase;
  flex-shrink: 0;
}

.title-main {
  font-size: 3rem;
  line-height: 0.9;
  letter-spacing: 1px;
}

.title-sub {
  font-size: 0.8rem;
  color: #a0a0a0;
  letter-spacing: 2px;
  margin-top: 8px;
}

/* ── Vehicle list ────────────────────────────────────────────────────── */
.vehicle-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  overflow-y: auto;
  padding-right: 10px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

.vehicle-list::-webkit-scrollbar { width: 3px; }
.vehicle-list::-webkit-scrollbar-thumb { background: #fff; }

.vehicle-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px 25px;
  cursor: pointer;
  transition: 0.2s cubic-bezier(0.23, 1, 0.32, 1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.vehicle-card:hover {
  background: rgba(255, 255, 255, 0.07);
}

.vehicle-card.active {
  background: #ffffff;
  border-color: #ffffff;
  transform: translateX(-5px);
}

.v-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.v-name {
  font-family: 'Oswald', sans-serif;
  font-size: 1.3rem;
  text-transform: uppercase;
  color: inherit;
}

.v-plate {
  font-size: 0.75rem;
  opacity: 0.5;
  font-weight: 600;
  color: inherit;
}

/* Active card — all text to black */
.vehicle-card.active .v-name,
.vehicle-card.active .v-plate {
  color: #000;
  opacity: 1;
}

.gb-empty {
  color: #555;
  font-size: 0.85rem;
  text-align: center;
  padding: 24px 0;
}

/* ── Action area ─────────────────────────────────────────────────────── */
.action-area {
  flex-shrink: 0;
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.details-box {
  margin-bottom: 25px;
}

.placeholder-details .detail-val {
  opacity: 0.3;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  text-transform: uppercase;
  font-weight: 700;
  color: #a0a0a0;
  margin-bottom: 10px;
}

.detail-val {
  color: #fff;
}

/* ── Retrieve button ─────────────────────────────────────────────────── */
.btn-retrieve {
  width: 100%;
  background: #fff;
  color: #000;
  border: none;
  padding: 22px;
  font-family: 'Oswald', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
  transition: opacity 0.2s;
  letter-spacing: 1px;
}

.btn-retrieve:hover:not(:disabled) {
  opacity: 0.88;
}

.btn-retrieve:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* ── Close button ────────────────────────────────────────────────────── */
.gb-close {
  position: absolute;
  top: 20px;
  right: 24px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #aaa;
  padding: 6px 14px;
  font-size: 0.7rem;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Inter', sans-serif;
}

.gb-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
</style>
