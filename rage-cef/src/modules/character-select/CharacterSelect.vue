<template>
  <div class="cs-overlay">
    <div class="cs-card">
      <!-- Header -->
      <div class="cs-header">
        <h1 class="cs-title">Select Character</h1>
        <p class="cs-sub">Choose a character to play or create a new one</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="cs-loading">
        <div class="spinner" />
      </div>

      <!-- Character Grid -->
      <div v-else class="cs-grid">
        <!-- Existing characters -->
        <div
          v-for="char in characters"
          :key="char.id"
          class="char-card"
          @click="selectCharacter(char.id)"
        >
          <div class="char-avatar">{{ char.firstName[0] }}{{ char.lastName[0] }}</div>
          <div class="char-info">
            <div class="char-name">{{ char.firstName }} {{ char.lastName }}</div>
            <div class="char-meta">{{ char.gender === 'male' ? '♂' : '♀' }} · ${{ char.cash.toLocaleString() }}</div>
            <div class="char-date">{{ formatDate(char.createdAt) }}</div>
          </div>
        </div>

        <!-- Create new slot -->
        <div
          v-if="characters.length < MAX_CHARS"
          class="char-card create-card"
          @click="showCreate = !showCreate; createError = ''"
        >
          <div class="char-avatar create-icon">+</div>
          <div class="char-info">
            <div class="char-name">New Character</div>
            <div class="char-meta">Slot {{ characters.length + 1 }} / {{ MAX_CHARS }}</div>
          </div>
        </div>
      </div>

      <!-- Create Form -->
      <Transition name="form">
        <form v-if="showCreate" @submit.prevent="createCharacter" class="create-form">
          <div class="create-row">
            <div class="create-field">
              <label class="field-label">First Name</label>
              <input v-model="newFirst" class="field-input" maxlength="32" placeholder="John" required />
            </div>
            <div class="create-field">
              <label class="field-label">Last Name</label>
              <input v-model="newLast" class="field-input" maxlength="32" placeholder="Doe" required />
            </div>
          </div>
          <div class="gender-row">
            <button type="button" :class="['gender-btn', { active: newGender === 'male' }]" @click="newGender = 'male'">♂ Male</button>
            <button type="button" :class="['gender-btn', { active: newGender === 'female' }]" @click="newGender = 'female'">♀ Female</button>
          </div>
          <div v-if="createError" class="auth-error">{{ createError }}</div>
          <button type="submit" class="submit-btn" :disabled="creating">
            <span v-if="creating" class="spinner" />
            <span>Create Character</span>
          </button>
        </form>
      </Transition>

      <!-- Error -->
      <div v-if="selectError" class="auth-error">{{ selectError }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { rpc } from '@/core';
import type { CharacterSummary } from '@ragemp/shared';

const MAX_CHARS = 3;

const characters = ref<CharacterSummary[]>([]);
const loading = ref(true);
const showCreate = ref(false);
const creating = ref(false);
const selectError = ref('');
const createError = ref('');

const newFirst = ref('');
const newLast = ref('');
const newGender = ref<'male' | 'female'>('male');

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

onMounted(async () => {
  try {
    characters.value = await rpc.callServer('character:getList');
  } finally {
    loading.value = false;
  }
});

async function selectCharacter(id: number) {
  selectError.value = '';
  const result = await rpc.callServer('character:select', id);
  if (!result.success) selectError.value = result.error ?? 'Failed to select character.';
}

async function createCharacter() {
  createError.value = '';
  creating.value = true;
  try {
    const char = await rpc.callServer('character:create', newFirst.value.trim(), newLast.value.trim(), newGender.value);
    characters.value.push(char);
    showCreate.value = false;
    newFirst.value = ''; newLast.value = '';
  } catch (e: unknown) {
    createError.value = e instanceof Error ? e.message : 'Server error.';
  } finally {
    creating.value = false;
  }
}
</script>

<style scoped>
.cs-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 6, 12, 0.88);
  backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', 'Segoe UI', sans-serif;
  pointer-events: auto;
}

.cs-card {
  width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  background: rgba(18, 22, 32, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  padding: 36px 32px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
}

/* ── Header ── */
.cs-header { margin-bottom: 24px; }
.cs-title { font-size: 22px; font-weight: 700; color: #f0f2f8; margin: 0 0 6px; }
.cs-sub { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0; }

/* ── Loading ── */
.cs-loading { display: flex; justify-content: center; padding: 40px 0; }

/* ── Grid ── */
.cs-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

/* ── Character card ── */
.char-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.char-card:hover { background: rgba(68, 102, 255, 0.1); border-color: rgba(68,102,255,0.3); }

.char-avatar {
  width: 44px; height: 44px;
  border-radius: 10px;
  background: linear-gradient(135deg, #4466ff, #8844ff);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  letter-spacing: -1px;
}

.create-card .char-avatar.create-icon {
  background: rgba(255,255,255,0.06);
  font-size: 22px;
  color: rgba(255,255,255,0.4);
}

.char-name { font-size: 15px; font-weight: 600; color: #f0f2f8; }
.char-meta { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 3px; }
.char-date { font-size: 11px; color: rgba(255,255,255,0.25); margin-top: 2px; }

/* ── Create form ── */
.create-form {
  border-top: 1px solid rgba(255,255,255,0.07);
  padding-top: 20px;
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.create-row { display: flex; gap: 12px; }
.create-field { flex: 1; }

.field-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 6px;
  margin-top: 14px;
}

.field-input {
  width: 100%;
  padding: 10px 13px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: #f0f2f8;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.field-input:focus { border-color: rgba(68, 102, 255, 0.6); }
.field-input::placeholder { color: rgba(255,255,255,0.2); }

.gender-row { display: flex; gap: 10px; margin-top: 14px; }
.gender-btn {
  flex: 1;
  padding: 9px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.45);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.gender-btn.active { background: rgba(68,102,255,0.15); border-color: rgba(68,102,255,0.4); color: #8899ff; }

.auth-error {
  margin-top: 12px;
  padding: 9px 12px;
  border-radius: 6px;
  background: rgba(255, 60, 60, 0.12);
  border: 1px solid rgba(255, 60, 60, 0.25);
  color: #ff8080;
  font-size: 13px;
}

.submit-btn {
  margin-top: 18px;
  width: 100%;
  padding: 11px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #4466ff, #6644ff);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: opacity 0.15s, transform 0.1s;
}
.submit-btn:hover:not(:disabled) { opacity: 0.88; }
.submit-btn:active:not(:disabled) { transform: scale(0.98); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Form transition ── */
.form-enter-active, .form-leave-active { transition: all 0.2s ease; }
.form-enter-from, .form-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
