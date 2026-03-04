<template>
  <div class="cs-wrapper">

    <div class="right-panel">
      <div class="section-header">Select Resident</div>

      <!-- Character List -->
      <div class="character-list">
        <!-- Loading state -->
        <template v-if="loading">
          <div v-for="i in 3" :key="i" class="char-card skeleton">
            <div class="char-name">——</div>
            <div class="char-meta">Loading…</div>
          </div>
        </template>

        <!-- Existing characters -->
        <template v-else>
          <div
            v-for="char in characters"
            :key="char.id"
            :class="['char-card', { active: selectedId === char.id }]"
            @click="selectChar(char)"
          >
            <div class="char-name">{{ char.firstName }}</div>
            <div class="char-meta">{{ char.gender === 'male' ? 'Male' : 'Female' }} · ${{ char.cash.toLocaleString() }}</div>
          </div>

          <!-- Empty slots -->
          <div
            v-for="i in emptySlots"
            :key="'empty-' + i"
            :class="['char-card', 'empty', { active: selectedId === 'new-' + i }]"
            @click="openCreator"
          >
            <div class="char-name">New</div>
            <div class="char-meta">Available Identity Slot</div>
          </div>
        </template>
      </div>

      <!-- Stats Panel (visible when a real character is selected) -->
      <Transition name="slide-up" mode="out-in">
        <div v-if="selected && !loading" class="stats-panel" :key="String(selectedId)">
          <div class="display-fullname">{{ selected.firstName }} {{ selected.lastName }}</div>

          <div class="stat-row">
            <span class="stat-label">Gender</span>
            <span class="stat-value">{{ selected.gender === 'male' ? 'Male' : 'Female' }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Physical Cash</span>
            <span class="stat-value cash-value">${{ selected.cash.toLocaleString() }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Bank Savings</span>
            <span class="stat-value bank-value">—</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Current Job</span>
            <span class="stat-value">Unemployed</span>
          </div>

          <div v-if="selectError" class="cs-error">{{ selectError }}</div>

          <button class="btn-spawn" :disabled="spawning" @click="spawnChar">
            <span v-if="spawning" class="spinner" />
            {{ spawning ? 'Waking up…' : 'Wake Up' }}
          </button>
        </div>
      </Transition>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { rpc } from '@/core';
import type { CharacterSummary } from '@ragemp/shared';

const MAX_CHARS = 3;

const characters = ref<CharacterSummary[]>([]);
const loading    = ref(true);
const spawning   = ref(false);
const selectError = ref('');
const selectedId = ref<number | string | null>(null);

const selected = computed(() =>
  typeof selectedId.value === 'number'
    ? characters.value.find(c => c.id === selectedId.value) ?? null
    : null
);

const emptySlots = computed(() => Math.max(0, MAX_CHARS - characters.value.length));

onMounted(async () => {
  try {
    characters.value = await rpc.callServer('character:getList');
    // Auto-select first character if any
    if (characters.value.length > 0) {
      selectedId.value = characters.value[0].id;
    }
  } finally {
    loading.value = false;
  }
});

// ── Live appearance preview ────────────────────────────────────────────────
// Whenever the highlighted character changes, push their saved appearance to
// the client so clothes/hair are applied to mp.players.local in real time.
watch(selected, (char) => {
  if (!char?.appearance) return;
  window.mp?.trigger('character:previewSelected', JSON.stringify(char.appearance));
}, { immediate: false });

function selectChar(char: CharacterSummary) {
  selectError.value = '';
  selectedId.value  = char.id;
}

function openCreator() {
  window.mp?.trigger('cmd:showPage', 'character-creator');
}

async function spawnChar() {
  if (!selected.value) return;
  selectError.value = '';
  spawning.value    = true;
  try {
    const result = await rpc.callServer('character:select', selected.value.id);
    if (!result.success) selectError.value = result.error ?? 'Failed to spawn.';
  } catch {
    selectError.value = 'Connection error. Try again.';
  } finally {
    spawning.value = false;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@300;400;600&display=swap');

:root {
  --primary-pink: #ff8fa3;
  --text-main:    #ffffff;
  --text-dim:     #a0a0a0;
  --border-color: rgba(255, 255, 255, 0.1);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Wrapper — single root, transparent ── */
.cs-wrapper {
  position: fixed;
  inset: 0;
  pointer-events: none;
  display: flex;
  justify-content: flex-end;
  /* Matches the reference body gradient exactly */
  background: linear-gradient(to right, transparent 50%, rgba(0, 0, 0, 0.8) 100%);
  font-family: 'Inter', sans-serif;
  color: #fff;
}

/* ── Right Panel ── */
.right-panel {
  width: 480px;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 80px 50px;
  z-index: 10;
  pointer-events: auto;
}

/* ── Section header ── */
.section-header {
  font-family: 'Oswald', sans-serif;
  font-size: 0.9rem;
  letter-spacing: 2px;
  color: var(--text-dim);
  margin-bottom: 30px;
  text-transform: uppercase;
}

/* ── Character list ── */
.character-list {
  display: flex;
  flex-direction: column;
  gap: 30px;
  margin-bottom: 40px;
}

.char-card {
  cursor: pointer;
  transition: 0.2s ease;
  position: relative;
}

/* Pink active bar — exact from reference */
.char-card.active::before {
  content: '';
  position: absolute;
  left: -30px;
  top: 10%;
  height: 80%;
  width: 6px;
  background: var(--primary-pink);
}

/* Large Oswald character first name */
.char-name {
  font-family: 'Oswald', sans-serif;
  font-size: 3.8rem;
  line-height: 1;
  text-transform: uppercase;
  color: white;
  letter-spacing: 1px;
  transition: color 0.2s;
}

.char-meta {
  font-size: 0.8rem;
  color: var(--text-dim);
  margin-top: 5px;
  font-weight: 600;
  text-transform: uppercase;
}

/* Empty slot — ghost outline text */
.char-card.empty .char-name {
  color: transparent;
  -webkit-text-stroke: 1px rgba(255, 255, 255, 0.2);
}
.char-card.empty:hover .char-name {
  color: rgba(255, 255, 255, 0.05);
}

/* Skeleton shimmer */
.char-card.skeleton .char-name {
  color: rgba(255,255,255,0.12);
  animation: pulse 1.4s ease infinite;
}
.char-card.skeleton .char-meta {
  color: rgba(255,255,255,0.08);
  animation: pulse 1.4s ease infinite 0.2s;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

/* ── Stats panel ── */
.stats-panel {
  margin-top: auto;
  background: rgba(15, 15, 15, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 35px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-right: 5px solid var(--primary-pink);
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
}

.display-fullname {
  font-family: 'Oswald', sans-serif;
  font-size: 1.8rem;
  margin-bottom: 25px;
  text-transform: uppercase;
  color: white;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 10px;
}
.stat-row:last-of-type { border-bottom: none; }

.stat-label {
  font-size: 0.75rem;
  color: var(--text-dim);
  font-weight: 700;
  text-transform: uppercase;
}

.stat-value   { font-size: 0.9rem; font-weight: 600; color: #fff; }
.cash-value   { color: #2ecc71; }
.bank-value   { color: #3498db; }

/* ── Error ── */
.cs-error {
  margin-top: 12px;
  padding: 10px 14px;
  background: rgba(255, 60, 60, 0.12);
  border: 1px solid rgba(255, 60, 60, 0.28);
  color: #ff8080;
  font-size: 0.85rem;
}

/* ── Spawn button ── */
.btn-spawn {
  width: 100%;
  background: white;
  color: black;
  border: none;
  padding: 18px;
  margin-top: 20px;
  font-family: 'Oswald', sans-serif;
  font-size: 1.3rem;
  text-transform: uppercase;
  cursor: pointer;
  transition: 0.2s;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.btn-spawn:hover:not(:disabled) {
  background: var(--primary-pink);
  color: white;
  transform: translateY(-2px);
}
.btn-spawn:disabled { opacity: 0.55; cursor: not-allowed; }

/* ── Spinner ── */
.spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(0,0,0,0.3);
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Stats slide-up transition ── */
.slide-up-enter-active { animation: slideUp 0.5s ease-out; }
.slide-up-leave-active { animation: slideUp 0.25s ease-out reverse; }
@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
