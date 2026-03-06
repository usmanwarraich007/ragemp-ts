<template>
  <div class="dm-root">
    <!-- Header -->
    <div class="dm-header">
      <div class="dm-header-left">
        <div class="dm-title">{{ state.name }}</div>
        <div class="dm-subtitle">MANAGE DEALERSHIP</div>
      </div>
      <div class="dm-header-right">
        <div class="dm-balance">BALANCE: <strong>${{ state.balance.toLocaleString() }}</strong></div>
        <button class="dm-toggle-btn" :class="state.isOpen ? 'open' : 'closed'" @click="toggleOpen">
          <span>{{ state.isOpen ? '🟢 OPEN' : '🔴 CLOSED' }}</span>
        </button>
        <button class="dm-close-btn" @click="close">✕</button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="dm-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="dm-tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >{{ tab.label }}</button>
    </div>

    <!-- ── Tab: Stock ─────────────────────────────────────────────── -->
    <div class="dm-content" v-if="activeTab === 'stock'">
      <div class="dm-table-wrap">
        <table class="dm-table">
          <thead>
            <tr>
              <th>VEHICLE</th>
              <th>CATEGORY</th>
              <th>STOCK</th>
              <th>BUY PRICE</th>
              <th>SELL PRICE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in state.stock" :key="item.invId">
              <td class="dm-td-name">{{ item.config.label }}</td>
              <td class="dm-td-cat">{{ item.config.category }}</td>
              <td :class="item.stock < 3 ? 'low-stock' : ''">{{ item.stock }}</td>
              <td>${{ item.purchasePrice.toLocaleString() }}</td>
              <td>
                <input
                  class="dm-price-input"
                  type="number"
                  :value="item.sellPrice"
                  min="0"
                  @change="updatePrice(item, Number(($event.target as HTMLInputElement).value))"
                />
              </td>
              <td class="dm-actions">
                <button class="dm-btn dm-btn-restock" @click="openRestock(item)">Restock</button>
                <button class="dm-btn dm-btn-remove" @click="removeItem(item)">Remove</button>
              </td>
            </tr>
            <tr v-if="state.stock.length === 0">
              <td colspan="6" class="dm-empty">No vehicles stocked. Use the "Add Stock" tab.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Restock modal -->
      <div class="dm-modal" v-if="restockTarget">
        <div class="dm-modal-box">
          <div class="dm-modal-title">RESTOCK — {{ restockTarget.config.label }}</div>
          <label class="dm-label">Quantity</label>
          <input class="dm-input" type="number" v-model.number="restockQty" min="1" />
          <label class="dm-label">Purchase price per unit ($)</label>
          <input class="dm-input" type="number" v-model.number="restockPrice" min="0" />
          <div class="dm-modal-cost">
            Total cost: <strong>${{ (restockQty * restockPrice).toLocaleString() }}</strong>
            (available: ${{ state.balance.toLocaleString() }})
          </div>
          <div class="dm-modal-actions">
            <button class="dm-btn" @click="restockTarget = null">Cancel</button>
            <button class="dm-btn dm-btn-confirm" :disabled="restocking" @click="confirmRestock">
              {{ restocking ? 'Processing…' : 'CONFIRM RESTOCK' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Tab: Add Stock ─────────────────────────────────────────── -->
    <div class="dm-content" v-else-if="activeTab === 'add'">
      <div class="dm-add-form">
        <div class="dm-form-row">
          <label class="dm-label">Vehicle Model</label>
          <div style="display:flex;gap:8px;align-items:flex-start">
            <!-- Custom dropdown — native <select> doesn't open in RAGE:MP CEF -->
            <div class="dm-dropdown" :class="{ open: modelDropOpen }">
              <div class="dm-dropdown-trigger" @click="modelDropOpen = !modelDropOpen">
                <span>{{ addModel ? (unstockedCatalog.find(m => m.model === addModel)?.label ?? addModel) : '-- select model --' }}</span>
                <span class="dm-dropdown-arrow">{{ modelDropOpen ? '▲' : '▼' }}</span>
              </div>
              <div class="dm-dropdown-list" v-if="modelDropOpen">
                <div
                  class="dm-dropdown-item"
                  :class="{ selected: addModel === '' }"
                  @click="addModel = ''; modelDropOpen = false"
                >-- select model --</div>
                <div
                  v-for="m in unstockedCatalog"
                  :key="m.model"
                  class="dm-dropdown-item"
                  :class="{ selected: addModel === m.model }"
                  @click="addModel = m.model; modelDropOpen = false"
                >{{ m.label }} <span style="color:#555;font-size:0.8em">({{ m.category }})</span></div>
                <div v-if="unstockedCatalog.length === 0" class="dm-dropdown-item" style="color:#555;pointer-events:none">
                  No models available
                </div>
              </div>
            </div>
            <button class="dm-btn" style="white-space:nowrap" @click="refreshCatalog">🔄 Refresh</button>
          </div>
        </div>



        <template v-if="addModelConfig">
          <div class="dm-add-stats">
            <span>⛽ {{ addModelConfig.fuelCapacity }}L</span>
            <span>📦 {{ addModelConfig.trunkVolume }}L trunk</span>
            <span>💺 {{ addModelConfig.seats }} seats</span>
            <span>Suggested: ${{ addModelConfig.basePrice.toLocaleString() }}</span>
          </div>
        </template>

        <div class="dm-form-row">
          <label class="dm-label">Quantity</label>
          <input class="dm-input" type="number" v-model.number="addQty" min="1" />
        </div>
        <div class="dm-form-row">
          <label class="dm-label">Purchase price per unit ($)</label>
          <input class="dm-input" type="number" v-model.number="addBuyPrice" min="0" />
        </div>
        <div class="dm-form-row">
          <label class="dm-label">Sell price per unit ($)</label>
          <input class="dm-input" type="number" v-model.number="addSellPrice" min="0" />
        </div>
        <div class="dm-add-summary" v-if="addModel">
          Total cost: <strong>${{ (addQty * addBuyPrice).toLocaleString() }}</strong>
          · Profit/unit: <strong>${{ (addSellPrice - addBuyPrice).toLocaleString() }}</strong>
        </div>
        <button
          class="dm-btn dm-btn-confirm dm-add-submit"
          :disabled="!addModel || adding"
          @click="confirmAdd"
        >
          {{ adding ? 'Processing…' : 'ADD TO STOCK' }}
        </button>
      </div>
    </div>

    <!-- ── Tab: Settings ──────────────────────────────────────────── -->
    <div class="dm-content dm-settings" v-else-if="activeTab === 'settings'">
      <div class="dm-setting-row">
        <div>
          <div class="dm-setting-label">Dealership Status</div>
          <div class="dm-setting-desc">Toggle whether customers can browse and buy vehicles.</div>
        </div>
        <button class="dm-toggle-btn" :class="state.isOpen ? 'open' : 'closed'" @click="toggleOpen">
          {{ state.isOpen ? 'OPEN' : 'CLOSED' }}
        </button>
      </div>

      <div class="dm-setting-row">
        <div>
          <div class="dm-setting-label">Business Balance</div>
          <div class="dm-setting-desc">Revenue from vehicle sales goes here.</div>
        </div>
        <div class="dm-balance-large">${{ state.balance.toLocaleString() }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { rpc } from '@/core';
import type { DealershipManageDto } from '@ragemp/shared';

type StockItem = DealershipManageDto['stock'][number];

// Prop: only businessId is passed from the client (like character-select receives nothing and fetches on mount)
const props = defineProps<{ data?: { businessId: number } }>();

const EMPTY: DealershipManageDto = { businessId: 0, name: '', balance: 0, isOpen: false, stock: [], catalog: [] };

const state   = ref<DealershipManageDto>(EMPTY);
const loading = ref(true);

const tabs = [
  { id: 'stock',    label: 'STOCK'     },
  { id: 'add',      label: 'ADD STOCK' },
  { id: 'settings', label: 'SETTINGS'  },
];
const activeTab = ref<string>('stock');

// ── Restock state ─────────────────────────────────────────────────────────────
const restockTarget = ref<StockItem | null>(null);
const restockQty    = ref(1);
const restockPrice  = ref(0);
const restocking    = ref(false);

// ── Add stock state ───────────────────────────────────────────────────────────
const addModel     = ref('');
const addQty       = ref(1);
const addBuyPrice  = ref(0);
const addSellPrice = ref(0);
const adding       = ref(false);
const modelDropOpen = ref(false);

// ── Fetch on mount — same pattern as CharacterSelect ─────────────────────────
onMounted(async () => {
  const businessId = props.data?.businessId ?? 0;
  if (!businessId) { loading.value = false; return; }
  try {
    state.value = await rpc.callServer('dealership:getManageData', businessId);
  } catch (err) {
    console.error('[DealershipManage] fetch error:', err);
  } finally {
    loading.value = false;
  }
});

// ── Derived ───────────────────────────────────────────────────────────────────

const stockedModels = computed(() => new Set(state.value.stock.filter(s => s.stock > 0).map((s) => s.config.model)));

const unstockedCatalog = computed(() =>
  state.value.catalog.filter((c) => !stockedModels.value.has(c.model))
);

const addModelConfig = computed(() =>
  state.value.catalog.find((c) => c.model === addModel.value) ?? null
);

// ── Actions ───────────────────────────────────────────────────────────────────

async function refreshCatalog() {
  const businessId = props.data?.businessId ?? state.value.businessId;
  if (!businessId) return;
  try {
    state.value = await rpc.callServer('dealership:getManageData', businessId);
  } catch (err) {
    console.error('[DealershipManage] refresh error:', err);
  }
}

async function toggleOpen() {
  const res = await rpc.callServer('business:toggle', state.value.businessId);
  if (res !== undefined) state.value.isOpen = (res as { isOpen: boolean }).isOpen;
}

async function updatePrice(item: StockItem, price: number) {
  await rpc.callServer('dealership:setPrice', state.value.businessId, item.config.model, price);
  item.sellPrice = price;
}

function openRestock(item: StockItem) {
  restockTarget.value = item;
  restockQty.value    = 1;
  restockPrice.value  = item.purchasePrice;
}

async function confirmRestock() {
  if (!restockTarget.value) return;
  restocking.value = true;
  const res = await rpc.callServer(
    'dealership:restock',
    state.value.businessId,
    restockTarget.value.config.model,
    restockQty.value,
    restockPrice.value,
  );
  restocking.value = false;
  if ((res as any)?.ok) {
    restockTarget.value.stock += restockQty.value;
  }
  restockTarget.value = null;
}

async function removeItem(item: StockItem) {
  await rpc.callServer('dealership:removeItem', state.value.businessId, item.config.model);
  state.value.stock = state.value.stock.filter((s) => s.config.model !== item.config.model);
}

async function confirmAdd() {
  if (!addModel.value) return;
  adding.value = true;
  const res = await rpc.callServer(
    'dealership:restock',
    state.value.businessId,
    addModel.value,
    addQty.value,
    addBuyPrice.value,
  );
  adding.value = false;

  if (!(res as any)?.ok) return; // server rejected (insufficient funds etc.) — don't update UI

  const config = addModelConfig.value!;
  state.value.stock.push({
    config,
    stock:         addQty.value,
    purchasePrice: addBuyPrice.value,
    sellPrice:     addSellPrice.value,
    invId:         -1,
  });

  addModel.value = '';
  activeTab.value = 'stock';
}

function close() {
  window.mp?.trigger('cmd:hidePage');
}
</script>


<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@300;400;600&display=swap');

* { box-sizing: border-box; }

.dm-root {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: rgba(8, 8, 12, 0.97);
  font-family: 'Inter', sans-serif;
  color: #e0e0e0;
  overflow: hidden;
}

/* Header */
.dm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 40px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
  flex-shrink: 0;
}
.dm-title {
  font-family: 'Oswald', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
}
.dm-subtitle { font-size: 0.65rem; color: #555; letter-spacing: 3px; margin-top: 2px; }
.dm-header-right { display: flex; align-items: center; gap: 16px; }
.dm-balance { font-size: 0.8rem; color: #888; }
.dm-balance strong { color: #e0e0e0; }

/* Toggle */
.dm-toggle-btn {
  padding: 8px 18px;
  border: 1px solid;
  border-radius: 20px;
  font-size: 0.75rem;
  font-family: 'Oswald', sans-serif;
  letter-spacing: 1px;
  cursor: pointer;
  background: transparent;
  transition: all 0.2s;
}
.dm-toggle-btn.open  { color: #4caf50; border-color: #4caf50; }
.dm-toggle-btn.closed { color: #f44336; border-color: #f44336; }
.dm-toggle-btn.open:hover  { background: rgba(76,175,80,0.1); }
.dm-toggle-btn.closed:hover { background: rgba(244,67,54,0.1); }

.dm-close-btn {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.12);
  color: #888;
  width: 32px; height: 32px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}
.dm-close-btn:hover { color: #fff; border-color: rgba(255,255,255,0.3); }

/* Tabs */
.dm-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
  padding: 0 40px;
}
.dm-tab {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #555;
  padding: 14px 24px;
  font-family: 'Oswald', sans-serif;
  font-size: 0.85rem;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.2s;
}
.dm-tab:hover { color: #aaa; }
.dm-tab.active { color: #fff; border-bottom-color: #fff; }

/* Content area */
.dm-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
  position: relative;
}

/* Table */
.dm-table-wrap { overflow-x: auto; }
.dm-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.dm-table thead tr {
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.dm-table th {
  text-align: left;
  font-size: 0.65rem;
  color: #555;
  letter-spacing: 2px;
  padding: 10px 14px;
  font-weight: 600;
}
.dm-table td { padding: 14px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); }
.dm-table tbody tr:hover td { background: rgba(255,255,255,0.02); }
.dm-td-name { font-weight: 500; }
.dm-td-cat { color: #777; font-size: 0.8rem; }
.low-stock { color: #f44336; font-weight: 600; }
.dm-empty { text-align: center; color: #444; padding: 32px 0; }

.dm-actions { display: flex; gap: 8px; }

/* Buttons */
.dm-btn {
  padding: 7px 14px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  color: #ccc;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Inter', sans-serif;
}
.dm-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.dm-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.dm-btn-restock { border-color: rgba(33,150,243,0.3); color: #64b5f6; }
.dm-btn-restock:hover { background: rgba(33,150,243,0.1); }
.dm-btn-remove  { border-color: rgba(244,67,54,0.3); color: #ef9a9a; }
.dm-btn-remove:hover { background: rgba(244,67,54,0.1); }
.dm-btn-confirm {
  background: rgba(255,255,255,0.9);
  color: #000;
  border-color: transparent;
  font-weight: 600;
}
.dm-btn-confirm:hover { background: #fff; }

/* Price input */
.dm-price-input {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: #e0e0e0;
  padding: 5px 8px;
  width: 100px;
  border-radius: 4px;
  font-size: 0.82rem;
  outline: none;
}
.dm-price-input:focus { border-color: rgba(255,255,255,0.3); }

/* Modal */
.dm-modal {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.dm-modal-box {
  background: #111318;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 32px 40px;
  width: 400px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dm-modal-title {
  font-family: 'Oswald', sans-serif;
  font-size: 1.2rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}
.dm-modal-cost { font-size: 0.8rem; color: #888; }
.dm-modal-cost strong { color: #e0e0e0; }
.dm-modal-actions { display: flex; gap: 10px; margin-top: 4px; }

/* Add form */
.dm-add-form {
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.dm-form-row { display: flex; flex-direction: column; gap: 6px; }
.dm-label { font-size: 0.7rem; color: #666; letter-spacing: 1.5px; }
.dm-input, .dm-select {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: #e0e0e0;
  padding: 10px 14px;
  border-radius: 4px;
  font-size: 0.88rem;
  outline: none;
  font-family: 'Inter', sans-serif;
}
.dm-input:focus, .dm-select:focus { border-color: rgba(255,255,255,0.3); }
.dm-select option { background: #111; }

.dm-add-stats {
  display: flex;
  gap: 16px;
  font-size: 0.78rem;
  color: #777;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 4px;
  padding: 10px 14px;
}
.dm-add-summary { font-size: 0.8rem; color: #888; }
.dm-add-summary strong { color: #e0e0e0; }
.dm-add-submit { padding: 12px 24px; font-size: 0.85rem; }

/* Settings */
.dm-settings { display: flex; flex-direction: column; gap: 24px; }
.dm-setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 6px;
}
.dm-setting-label { font-weight: 600; font-size: 0.9rem; margin-bottom: 4px; }
.dm-setting-desc { font-size: 0.78rem; color: #666; }
.dm-balance-large {
  font-family: 'Oswald', sans-serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: #4caf50;
}
/* Custom dropdown — replaces native <select> which doesn't open in RAGE:MP CEF */
.dm-dropdown {
  position: relative;
  min-width: 280px;
  flex: 1;
}
.dm-dropdown-trigger {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: #e0e0e0;
  padding: 10px 14px;
  border-radius: 4px;
  font-size: 0.88rem;
  cursor: pointer;
  user-select: none;
  transition: border-color 0.2s;
}
.dm-dropdown-trigger:hover,
.dm-dropdown.open .dm-dropdown-trigger {
  border-color: rgba(255,255,255,0.3);
}
.dm-dropdown-arrow { font-size: 0.7rem; color: #666; margin-left: 8px; }
.dm-dropdown-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #1a1a22;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 4px;
  max-height: 220px;
  overflow-y: auto;
  z-index: 100;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.15) transparent;
}
.dm-dropdown-item {
  padding: 10px 14px;
  font-size: 0.85rem;
  color: #ccc;
  cursor: pointer;
  transition: background 0.15s;
}
.dm-dropdown-item:hover { background: rgba(255,255,255,0.07); color: #fff; }
.dm-dropdown-item.selected { background: rgba(255,255,255,0.1); color: #fff; }
</style>
