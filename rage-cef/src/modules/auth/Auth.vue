<template>
  <div class="auth-overlay">
    <div class="auth-card">
      <!-- Logo/Title -->
      <div class="auth-header">
        <div class="auth-logo">RP</div>
        <h1 class="auth-title">Welcome</h1>
        <p class="auth-sub">Sign in to your account or create a new one</p>
      </div>

      <!-- Tabs -->
      <div class="auth-tabs">
        <button :class="['tab', { active: tab === 'login' }]" @click="tab = 'login'; error = ''">Login</button>
        <button :class="['tab', { active: tab === 'register' }]" @click="tab = 'register'; error = ''">Register</button>
      </div>

      <!-- Form -->
      <form @submit.prevent="submit" class="auth-form">
        <label class="field-label">Username</label>
        <input
          v-model="username"
          class="field-input"
          type="text"
          placeholder="Enter username"
          autocomplete="off"
          maxlength="32"
          required
        />

        <label class="field-label">Password</label>
        <input
          v-model="password"
          class="field-input"
          type="password"
          placeholder="Enter password"
          maxlength="64"
          required
        />

        <!-- Error -->
        <div v-if="error" class="auth-error">{{ error }}</div>

        <button type="submit" class="submit-btn" :disabled="loading">
          <span v-if="loading" class="spinner" />
          <span>{{ tab === 'login' ? 'Sign In' : 'Create Account' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { rpc } from '@/core';

const tab = ref<'login' | 'register'>('login');
const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const result = tab.value === 'login'
      ? await rpc.callServer('auth:login', username.value.trim(), password.value)
      : await rpc.callServer('auth:register', username.value.trim(), password.value);

    if (!result.success) error.value = result.error ?? 'Something went wrong.';
  } catch {
    error.value = 'Connection error. Try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-overlay {
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

.auth-card {
  width: 380px;
  background: rgba(18, 22, 32, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  padding: 36px 32px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
}

/* ── Header ── */
.auth-header { text-align: center; margin-bottom: 28px; }

.auth-logo {
  width: 48px; height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #4466ff, #8844ff);
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 14px;
}

.auth-title {
  font-size: 22px;
  font-weight: 700;
  color: #f0f2f8;
  margin: 0 0 6px;
}

.auth-sub {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

/* ── Tabs ── */
.auth-tabs {
  display: flex;
  margin-bottom: 24px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  padding: 3px;
  gap: 3px;
}

.tab {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.tab.active {
  background: rgba(255, 255, 255, 0.09);
  color: #f0f2f8;
}

/* ── Form ── */
.auth-form { display: flex; flex-direction: column; gap: 0; }

.field-label {
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

/* ── Error ── */
.auth-error {
  margin-top: 12px;
  padding: 9px 12px;
  border-radius: 6px;
  background: rgba(255, 60, 60, 0.12);
  border: 1px solid rgba(255, 60, 60, 0.25);
  color: #ff8080;
  font-size: 13px;
}

/* ── Submit ── */
.submit-btn {
  margin-top: 22px;
  width: 100%;
  padding: 11px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #4466ff, #6644ff);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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
</style>
