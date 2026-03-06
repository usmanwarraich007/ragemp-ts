<template>
  <div class="db-root" tabindex="-1" @keydown.esc="close" ref="rootEl">
    <!-- Left panel -->
    <div class="db-left">
      <div class="db-header">
        <div class="db-title">{{ state.name }}</div>
        <div class="db-subtitle">VEHICLE DEALERSHIP</div>
      </div>

      <!-- Category filter -->
      <div class="db-filter">
        <select v-model="selectedCategory" class="db-select">
          <option value="">ALL CATEGORIES</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat.toUpperCase() }}</option>
        </select>
      </div>

      <!-- Vehicle list -->
      <div class="db-list">
        <div
          v-for="item in filteredStock"
          :key="item.config.model"
          class="db-card"
          :class="{ active: selected?.config.model === item.config.model }"
          @click="select(item)"
        >
          <div class="db-card-info">
            <span class="db-card-name">{{ item.config.label }}</span>
            <span class="db-card-meta">IN STOCK: {{ item.stock }} &bull; {{ item.config.seats }} SEATS</span>
          </div>
          <span class="db-card-price">${{ item.price.toLocaleString() }}</span>
        </div>

        <div v-if="filteredStock.length === 0" class="db-empty">No vehicles in stock for this category.</div>
      </div>
    </div>

    <!-- Right panel -->
    <div class="db-right" v-if="selected">
      <div class="db-detail-name">{{ selected.config.label }}</div>
      <div class="db-detail-cat">{{ selected.config.category }} · {{ selected.config.seats }} seats</div>

      <!-- Stat bars -->
      <div class="db-stats">
        <div v-for="stat in stats" :key="stat.label" class="db-stat-item">
          <div class="db-stat-info">
            <span class="db-stat-label">{{ stat.label }}</span>
            <span class="db-stat-value">{{ stat.value }}</span>
          </div>
          <div class="db-stat-bar">
            <div class="db-stat-fill" :style="{ width: stat.value + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- Info pills -->
      <div class="db-pills">
        <span class="db-pill"> {{ selected.config.fuelCapacity }}L tank</span>
        <span class="db-pill"> {{ selected.config.trunkVolume }}L trunk</span>
        <span v-for="tag in selected.config.tags" :key="tag" class="db-pill tag">{{ tag }}</span>
      </div>

      <!-- Color picker -->
      <div class="db-color-section">
        <div class="db-color-label">COLOUR</div>
        <div class="db-colors">
          <div
            v-for="color in selected.config.colors"
            :key="color"
            class="db-color-dot"
            :class="{ active: chosenColor === color }"
            :style="{ background: color }"
            @click="chosenColor = color"
          ></div>
        </div>
      </div>

      <!-- Warning + buy -->
      <div class="db-purchase-area">
        <div class="db-warning">
          <strong>Warning</strong><br />
          The purchased vehicle cannot and will not be refunded. Please verify your selection.
        </div>
        <button class="db-buy-btn" :disabled="buying" @click="buy">
          <span v-if="buying">Processing&hellip;</span>
          <span v-else>PURCHASE FOR ${{ selected.price.toLocaleString() }}</span>
        </button>
      </div>
    </div>

    <!-- Placeholder when nothing selected -->
    <div class="db-right db-right-empty" v-else>
      <div class="db-placeholder">← Select a vehicle to see details</div>
    </div>

    <!-- Close hint -->
    <button class="db-close" @click="close">✕ CLOSE</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { rpc } from '@/core';
import type { DealershipStockItemDto } from '@ragemp/shared';

interface PageState {
  businessId: number;
  name: string;
  stock: DealershipStockItemDto[];
}

// Client passes { businessId, name } via browserManager.show(page, { businessId, name })
const props = defineProps<{ data?: { businessId: number; name: string } }>();

const state = ref<PageState>({
  businessId: props.data?.businessId ?? 0,
  name: props.data?.name ?? 'Dealership',
  stock: []
});
const selected = ref<DealershipStockItemDto | null>(null);
const chosenColor = ref('#ffffff');
const buying = ref(false);
const loading = ref(true);
const selectedCategory = ref('');

// ── Fetch on mount — same pattern as CharacterSelect ─────────────────────────
onMounted(async () => {
  const businessId = props.data?.businessId ?? 0;
  if (!businessId) {
    loading.value = false;
    return;
  }
  try {
    state.value.stock = await rpc.callServer('dealership:getStock', businessId);
  } finally {
    loading.value = false;
  }
});

// ── Derived ───────────────────────────────────────────────────────────────────

const categories = computed(() => [...new Set(state.value.stock.map((s) => s.config.category))].sort());

const filteredStock = computed(() =>
  selectedCategory.value
    ? state.value.stock.filter((s) => s.config.category === selectedCategory.value)
    : state.value.stock
);

const stats = computed(() => {
  if (!selected.value) return [];
  const c = selected.value.config;
  return [
    { label: 'SPEED', value: c.speed },
    { label: 'ACCELERATION', value: c.accel },
    { label: 'BRAKES', value: c.brakes },
    { label: 'TRACTION', value: c.traction }
  ];
});

// ── Actions ───────────────────────────────────────────────────────────────────

// Debounce helper for color preview updates
let previewTimer: ReturnType<typeof setTimeout> | null = null;
function triggerPreview(model: string, color: string) {
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    window.mp?.trigger('dealership:previewVehicle', model, color);
  }, 300);
}

function select(item: DealershipStockItemDto) {
  selected.value = item;
  chosenColor.value = item.config.colors[0] ?? '#ffffff';
  // Immediately preview the selected model with default color
  window.mp?.trigger('dealership:previewVehicle', item.config.model, chosenColor.value);
}

// Watch color changes and update preview vehicle
watch(chosenColor, (newColor) => {
  if (selected.value) triggerPreview(selected.value.config.model, newColor);
});

async function buy() {
  if (!selected.value || buying.value) return;
  buying.value = true;
  try {
    const res = await rpc.callServer(
      'dealership:buyVehicle',
      state.value.businessId,
      selected.value.config.model,
      chosenColor.value
    );
    if (res?.ok) {
      // Server cleared the session and put player in real vehicle
      // Just close the CEF — do NOT trigger exitPreview (would tp player back)
      window.mp?.trigger('cmd:hidePage');
    }
  } finally {
    buying.value = false;
  }
}

function close() {
  // Tell client to clean up preview session (tp player back, destroy temp vehicle)
  window.mp?.trigger('dealership:exitPreview');
  window.mp?.trigger('cmd:hidePage');
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@300;400;600&display=swap');

* {
  box-sizing: border-box;
}

.db-root {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: space-between;
  background: linear-gradient(
    to right,
    rgba(0, 0, 0, 0.92) 0%,
    rgba(0, 0, 0, 0.4) 38%,
    rgba(0, 0, 0, 0.4) 62%,
    rgba(0, 0, 0, 0.92) 100%
  );
  font-family: 'Inter', sans-serif;
  color: #fff;
  overflow: hidden;
}

/* ── Left panel ────────────────────────────────────────────────────── */
.db-left {
  width: 420px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 56px 48px;
  gap: 16px;
}

.db-header {
  margin-bottom: 8px;
}
.db-title {
  font-family: 'Oswald', sans-serif;
  font-size: 2.8rem;
  font-weight: 700;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.db-subtitle {
  font-size: 0.7rem;
  color: #888;
  letter-spacing: 3px;
  margin-top: 6px;
}

.db-select {
  width: 100%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  padding: 10px 14px;
  font-family: 'Oswald', sans-serif;
  text-transform: uppercase;
  font-size: 0.85rem;
  outline: none;
  cursor: pointer;
  border-radius: 4px;
}
.db-select option {
  background: #111;
}

.db-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.db-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px 25px;
  cursor: pointer;
  transition: 0.2s cubic-bezier(0.23, 1, 0.32, 1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.db-card:hover {
  background: rgba(255, 255, 255, 0.07);
}
.db-card.active {
  background: #ffffff;
  border-color: #ffffff;
}

.db-card-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.db-card-name {
  font-family: 'Oswald', sans-serif;
  font-size: 1.3rem;
  text-transform: uppercase;
  color: inherit;
}
.db-card-meta {
  font-size: 0.7rem;
  opacity: 0.5;
  text-transform: uppercase;
  color: inherit;
}
.db-card-price {
  font-family: 'Oswald', sans-serif;
  font-size: 1.1rem;
  color: inherit;
}
/* Active card — invert all text to black */
.db-card.active .db-card-name,
.db-card.active .db-card-meta,
.db-card.active .db-card-price {
  color: #000;
  opacity: 1;
}

.db-empty {
  color: #666;
  font-size: 0.85rem;
  margin-top: 20px;
  text-align: center;
}

/* ── Right panel ───────────────────────────────────────────────────── */
.db-right {
  width: 400px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 56px 48px;
  gap: 20px;
}
.db-right-empty {
  justify-content: center;
  align-items: center;
}
.db-placeholder {
  color: #555;
  font-size: 0.9rem;
  letter-spacing: 1px;
}

.db-detail-name {
  font-family: 'Oswald', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  text-transform: uppercase;
}
.db-detail-cat {
  font-size: 0.78rem;
  color: #888;
  letter-spacing: 2px;
}

/* Stat bars */
.db-stats {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.db-stat-item {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.db-stat-info {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.db-stat-label {
  font-size: 0.68rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.db-stat-bar {
  width: 100%;
  height: 2px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}
.db-stat-fill {
  height: 100%;
  background: #fff;
  transition: width 0.4s ease;
}
.db-stat-value {
  font-size: 0.72rem;
  font-weight: 700;
  color: #fff;
}

/* Pills */
.db-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.db-pill {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 0.72rem;
  color: #aaa;
}
.db-pill.tag {
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Color picker */
.db-color-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.db-color-label {
  font-size: 0.65rem;
  color: #666;
  letter-spacing: 2px;
}
.db-colors {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.db-color-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition:
    transform 0.15s,
    border-color 0.15s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}
.db-color-dot:hover {
  transform: scale(1.15);
}
.db-color-dot.active {
  border-color: #fff;
  transform: scale(1.2);
}
.db-color-preview {
  height: 6px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  padding: 0 8px;
}
.db-color-preview span {
  font-size: 0.6rem;
  color: rgba(0, 0, 0, 0.5);
  font-family: monospace;
}

/* Notice */
.db-notice {
  font-size: 0.75rem;
  color: #666;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  padding: 10px 14px;
  line-height: 1.5;
}

/* Buy row */
.db-purchase-area {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.db-warning {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
  margin-bottom: 20px;
  border-left: 2px solid rgba(255, 255, 255, 0.3);
  padding-left: 14px;
}
.db-warning strong {
  display: block;
  margin-bottom: 2px;
  color: rgba(255, 255, 255, 0.7);
}

.db-buy-btn {
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
}
.db-buy-btn:hover {
  opacity: 0.88;
}
.db-buy-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}


/* Close */
.db-close {
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
  border-radius: 4px;
  transition: all 0.2s;
}
.db-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
</style>
