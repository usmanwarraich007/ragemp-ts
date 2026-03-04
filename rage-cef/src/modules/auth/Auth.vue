<template>
  <div class="auth-wrapper">
  <!-- Background layer -->
  <div class="auth-bg" />

  <div class="auth-root">
    <!-- Left Sidebar -->
    <div class="sidebar">
      <div class="sidebar-label">Account Gateway</div>
      <nav class="nav-list">
        <div
          :class="['nav-item', { active: tab === 'register' }]"
          @click="switchTab('register')"
        >
          <span class="nav-label">Registration</span>
        </div>
        <div
          :class="['nav-item', { active: tab === 'login' }]"
          @click="switchTab('login')"
        >
          <span class="nav-label">Login</span>
        </div>
      </nav>
    </div>

    <!-- Right Panel Area -->
    <div class="panel-area">

      <!-- PANELS (mode="out-in" prevents both from showing during transition) -->
      <Transition name="slide" mode="out-in">
        <main v-if="tab === 'login'" class="panel" key="login">
          <div class="panel-title">Resident Login</div>
          <div class="panel-greeting">Enter your credentials to return to the streets of Horizon City.</div>

          <form @submit.prevent="submit">
            <div class="input-group">
              <label class="input-label">USERNAME OR EMAIL</label>
              <div class="input-row" :class="{ focused: focusedField === 'username' }">
                <input
                  v-model="username"
                  type="text"
                  placeholder="Identity name"
                  autocomplete="off"
                  maxlength="64"
                  required
                  @focus="focusedField = 'username'"
                  @blur="focusedField = ''"
                />
              </div>
            </div>

            <div class="input-group">
              <label class="input-label">PASSWORD</label>
              <div class="input-row" :class="{ focused: focusedField === 'password' }">
                <input
                  v-model="password"
                  type="password"
                  placeholder="••••••••"
                  maxlength="64"
                  required
                  @focus="focusedField = 'password'"
                  @blur="focusedField = ''"
                />
              </div>
            </div>

            <label class="options-row">
              <input type="checkbox" v-model="rememberMe" />
              <span>Keep me logged in on this machine</span>
            </label>

            <div v-if="error" class="auth-error">{{ error }}</div>

            <button type="submit" class="action-btn" :disabled="loading">
              <span v-if="loading" class="spinner" />
              <span>{{ loading ? 'Authorizing…' : 'Authorize' }}</span>
            </button>
          </form>
        </main>
        <main v-else class="panel" key="register">
          <div class="panel-title">Establish Identity</div>
          <div class="panel-greeting">Choose a unique username and secure your account to begin your journey.</div>

          <form @submit.prevent="submit">
            <div class="row-split">
              <div class="input-group">
                <label class="input-label">USERNAME</label>
                <div class="input-row" :class="{ focused: focusedField === 'reg-username' }">
                  <input
                    v-model="username"
                    type="text"
                    placeholder="Choose name"
                    autocomplete="off"
                    maxlength="32"
                    required
                    @focus="focusedField = 'reg-username'"
                    @blur="focusedField = ''"
                  />
                </div>
              </div>
              <div class="input-group">
                <label class="input-label">EMAIL ADDRESS</label>
                <div class="input-row" :class="{ focused: focusedField === 'email' }">
                  <input
                    v-model="email"
                    type="email"
                    placeholder="email@address.com"
                    maxlength="255"
                    required
                    @focus="focusedField = 'email'"
                    @blur="focusedField = ''"
                  />
                </div>
              </div>
            </div>

            <div class="input-group">
              <label class="input-label">PASSWORD</label>
              <div class="input-row" :class="{ focused: focusedField === 'reg-password' }">
                <input
                  v-model="password"
                  type="password"
                  placeholder="••••••••"
                  maxlength="64"
                  required
                  @focus="focusedField = 'reg-password'"
                  @blur="focusedField = ''"
                />
              </div>
            </div>

            <div class="input-group">
              <label class="input-label">REPEAT PASSWORD</label>
              <div class="input-row" :class="{ focused: focusedField === 'confirm' }">
                <input
                  v-model="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  maxlength="64"
                  required
                  @focus="focusedField = 'confirm'"
                  @blur="focusedField = ''"
                />
              </div>
            </div>

            <div class="notice">
              ⚠ Accounts are bound to your email — ensure it's accessible.
            </div>

            <div v-if="error" class="auth-error">{{ error }}</div>

            <button type="submit" class="action-btn" :disabled="loading">
              <span v-if="loading" class="spinner" />
              <span>{{ loading ? 'Creating…' : 'Confirm Identity' }}</span>
            </button>
          </form>
        </main>
      </Transition>

    </div>
  </div>

  <!-- Footer -->
  <div class="footer-tabs">
    <div class="footer-pill">Website</div>
    <div class="footer-pill">Discord</div>
    <div class="footer-pill">Rules</div>
  </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { rpc } from '@/core';

const tab = ref<'login' | 'register'>('login');
const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const rememberMe = ref(false);
const error = ref('');
const loading = ref(false);
const focusedField = ref('');

function switchTab(next: 'login' | 'register') {
  tab.value = next;
  error.value = '';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function submit() {
  error.value = '';

  if (tab.value === 'register') {
    if (username.value.trim().length < 3)
      return (error.value = 'Username must be at least 3 characters.');
    if (!EMAIL_RE.test(email.value.trim()))
      return (error.value = 'Please enter a valid email address.');
    if (password.value.length < 6)
      return (error.value = 'Password must be at least 6 characters.');
    if (password.value !== confirmPassword.value)
      return (error.value = 'Passwords do not match.');
  }

  loading.value = true;
  try {
    const result =
      tab.value === 'login'
        ? await rpc.callServer('auth:login', username.value.trim(), password.value)
        : await rpc.callServer('auth:register', username.value.trim(), password.value, email.value.trim());

    if (!result.success) error.value = result.error ?? 'Something went wrong.';
  } catch {
    error.value = 'Connection error. Try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@300;400;600&display=swap');

/* ── Variables ── */
:root {
  --pink: #ff8fa3;
}

/* ── Base reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* Single root wrapper — transparent, lets children manage pointer-events */
.auth-wrapper {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

/* ── Background ── */
.auth-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
 /* background-image:
    linear-gradient(to right, rgba(0,0,0,0.88) 32%, transparent 100%),
    url('https://wallpapercat.com/w/middle-retina/b/8/a/2153211-1920x1080-desktop-full-hd-gta-v-wallpaper-image.jpg');*/
  background-size: cover;
  background-position: center;
  filter: blur(3px) saturate(0.9);
  transform: scale(1.03);
}

/* ── Root Layout ── */
.auth-root {
  position: fixed;
  inset: 0;
  z-index: 1;
  display: flex;
  font-family: 'Inter', sans-serif;
  color: #fff;
  pointer-events: auto;
}

/* ── Sidebar ── */
.sidebar {
  width: 420px;
  flex-shrink: 0;
  padding: 80px 60px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  z-index: 2;
}

.sidebar-label {
  font-family: 'Oswald', sans-serif;
  font-size: 1rem;
  letter-spacing: 3px;
  color: rgba(255,255,255,0.5);
  margin-bottom: 40px;
  text-transform: uppercase;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nav-item {
  padding: 4px 0;
  cursor: pointer;
}

.nav-label {
  font-family: 'Oswald', sans-serif;
  font-size: 3.6rem;
  line-height: 1;
  text-transform: uppercase;
  color: rgba(255,255,255,0.35);
  transition: color 0.25s ease, transform 0.25s ease;
  display: inline-block;
}

.nav-item.active .nav-label {
  color: #ff8fa3;
}

.nav-item:hover .nav-label {
  transform: translateX(10px);
  color: rgba(255,255,255,0.75);
}
.nav-item.active:hover .nav-label {
  color: #ff8fa3;
}

/* ── Panel Area ── */
.panel-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 40px;
  position: relative;
}

/* ── Panel ── */
.panel {
  width: 680px;
  max-height: 90vh;
  overflow-y: auto;
  background: rgba(10,10,12,0.93);
  padding: 56px 60px;
  border-left: 5px solid #ff8fa3;
  box-shadow: 0 30px 80px rgba(0,0,0,0.7);
}

.panel-title {
  font-family: 'Oswald', sans-serif;
  font-size: 2.2rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 10px;
}

.panel-greeting {
  font-size: 0.92rem;
  color: rgba(255,255,255,0.5);
  margin-bottom: 36px;
  line-height: 1.6;
}

/* ── Input ── */
.input-group {
  margin-bottom: 22px;
}

.row-split {
  display: flex;
  gap: 20px;
}
.row-split .input-group {
  flex: 1;
}

.input-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(255,255,255,0.45);
  letter-spacing: 1.5px;
  display: block;
  margin-bottom: 10px;
  text-transform: uppercase;
}

.input-row {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  height: 52px;
  padding: 0 18px;
  transition: border-color 0.25s, background 0.25s;
}

.input-row.focused,
.input-row:focus-within {
  border-color: #ff8fa3;
  background: rgba(255,255,255,0.08);
}

.input-row input {
  background: transparent;
  border: none;
  color: #fff;
  width: 100%;
  outline: none;
  font-size: 1rem;
  font-family: 'Inter', sans-serif;
}

.input-row input::placeholder { color: rgba(255,255,255,0.22); }

/* ── Options row ── */
.options-row {
  margin: 20px 0;
  font-size: 0.85rem;
  color: rgba(255,255,255,0.5);
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}
.options-row input[type="checkbox"] {
  accent-color: #ff8fa3;
  width: 15px;
  height: 15px;
}

/* ── Notice ── */
.notice {
  font-size: 0.75rem;
  color: #e9b300;
  margin: 4px 0 22px;
  padding: 14px 16px;
  border: 1px solid rgba(233,179,0,0.22);
  background: rgba(233,179,0,0.05);
  line-height: 1.5;
}

/* ── Error ── */
.auth-error {
  margin-bottom: 14px;
  padding: 10px 14px;
  background: rgba(255, 60, 60, 0.12);
  border: 1px solid rgba(255, 60, 60, 0.28);
  color: #ff8080;
  font-size: 0.85rem;
}

/* ── Button ── */
.action-btn {
  width: 100%;
  background: #fff;
  color: #000;
  padding: 17px;
  border: none;
  font-family: 'Oswald', sans-serif;
  font-weight: 700;
  font-size: 1.15rem;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 6px;
}

.action-btn:hover:not(:disabled) {
  background: #ff8fa3;
  color: #fff;
}

.action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ── Spinner ── */
.spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(0,0,0,0.25);
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Slide Transition ── */
.slide-enter-active {
  animation: slideIn 0.45s cubic-bezier(0.23, 1, 0.32, 1);
}
.slide-leave-active {
  animation: slideIn 0.25s cubic-bezier(0.23, 1, 0.32, 1) reverse;
}
@keyframes slideIn {
  from { opacity: 0; transform: translateX(50px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* ── Footer ── */
.footer-tabs {
  position: fixed;
  bottom: 38px;
  left: 58px;
  z-index: 2;
  display: flex;
  gap: 12px;
}

.footer-pill {
  background: rgba(255,255,255,0.1);
  padding: 8px 22px;
  border-radius: 25px;
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.25s, color 0.25s;
  color: #fff;
}

.footer-pill:hover {
  background: #fff;
  color: #000;
}
</style>
