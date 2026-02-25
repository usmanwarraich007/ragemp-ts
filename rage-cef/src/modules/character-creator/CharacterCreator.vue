<template>
  <div class="cc-root">

    <!-- ── Left Panel ─────────────────────────────────────────────────────── -->
    <aside class="cc-panel"
      @mouseenter="onPanelEnter"
      @mouseleave="onPanelLeave"
    >

      <!-- Header + rotate -->
      <div class="panel-header">
        <div class="logo">
          <span class="logo-main">CHARACTER</span>
          <span class="logo-sub">CREATOR</span>
        </div>
        <div class="rotate-row">
          <button class="rot-btn" @click="rotate(-1)">◁</button>
          <span class="rot-label">ROTATE</span>
          <button class="rot-btn" @click="rotate(1)">▷</button>
        </div>
      </div>

      <!-- Identity -->
      <div class="id-strip">
        <input v-model="firstName" class="id-input" placeholder="First Name" maxlength="32" />
        <input v-model="lastName"  class="id-input" placeholder="Last Name"  maxlength="32" />
        <div class="gender-row">
          <button :class="['gndr', { active: gender === 'male' }]"   @click="setGender('male')">♂ Male</button>
          <button :class="['gndr', { active: gender === 'female' }]" @click="setGender('female')">♀ Female</button>
        </div>
      </div>

      <!-- Tab icon bar -->
      <div class="tab-bar">
        <button v-for="t in TABS" :key="t.id"
          :class="['tab-btn', { active: activeTab === t.id }]"
          @click="activeTab = t.id" :title="t.label">
          <span class="tab-ico">{{ t.icon }}</span>
          <span class="tab-lbl">{{ t.label }}</span>
        </button>
      </div>

      <!-- Panel content -->
      <div class="panel-scroll">
        <FacePanel     v-if="activeTab === 'face'" />
        <BodyPanel     v-else-if="activeTab === 'body'" />
        <ClothingPanel v-else-if="activeTab === 'clothing'" />
      </div>

      <!-- Footer -->
      <div class="panel-footer">
        <div v-if="errorMsg" class="err-bar">{{ errorMsg }}</div>
        <div class="footer-row">
          <button class="btn-cancel" @click="cancel">Cancel</button>
          <button class="btn-save" :disabled="saving" @click="submit">
            <span v-if="saving" class="spin" />Save
          </button>
        </div>
      </div>
    </aside>

    <!-- Game area — invisible div that captures mouse drag + scroll for camera -->
    <div class="game-area"
      ref="gameAreaRef"
      tabindex="0"
      :class="{ dragging: isDragging }"
      @mousedown.left="onMouseDown"
      @wheel.prevent="onWheel"
      @keydown="onKey" />

    <!-- Camera hints (bottom-right, transparent) -->
    <div class="cam-hints">
      <div class="cam-title">🖱 Camera</div>
      <div>Hold LMB + drag to orbit</div>
      <div>Scroll to zoom</div>
      <div>← → Arrow keys rotate character</div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, provide, watch, onMounted, onUnmounted } from 'vue';
import type { Ref } from 'vue';
import { rpc } from '@/core';
import { defaultAppearance } from '@ragemp/shared';
import type { CharacterAppearance } from '@ragemp/shared';
import { APP_KEY, PREVIEW_KEY, TOGGLE_OVERLAY_KEY } from './injectionKeys';
import FacePanel     from './panels/FacePanel.vue';
import BodyPanel     from './panels/BodyPanel.vue';
import ClothingPanel from './panels/ClothingPanel.vue';

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'face',     icon: '👤', label: 'Face'     },
  { id: 'body',     icon: '💪', label: 'Body'     },
  { id: 'clothing', icon: '👕', label: 'Clothing' },
];
const activeTab = ref('face');

// ── Identity ──────────────────────────────────────────────────────────────────
const firstName = ref('');
const lastName  = ref('');
const gender    = ref<'male' | 'female'>('male');

function setGender(g: 'male' | 'female') {
  gender.value = g;
  Object.assign(app, defaultAppearance(g));
  preview();
}

// ── Shared appearance state ───────────────────────────────────────────────────
const app = reactive<CharacterAppearance>(defaultAppearance('male'));

// ── Game-area ref (for keyboard focus) ───────────────────────────────────────
const gameAreaRef: Ref<HTMLDivElement | null> = ref(null);

// ── Overlay definitions (needed for toggleOverlay) ────────────────────────────
const OVERLAY_COLOR_TYPES: Record<number, number> = {
  0: 0, 1: 1, 2: 1, 3: 0, 4: 2, 5: 2, 6: 0, 7: 0, 8: 2, 9: 0, 10: 1, 11: 0, 12: 0,
};

function toggleOverlay(slot: number, on: boolean): void {
  app.overlays[slot] = on
    ? { index: 0, opacity: 1, colorType: OVERLAY_COLOR_TYPES[slot] ?? 0, color: 0, secondColor: 0 }
    : { index: -1, opacity: 0, colorType: 0, color: 0, secondColor: 0 };
  preview();
}

// ── Live preview ──────────────────────────────────────────────────────────────
function preview(): void {
  window.mp?.trigger('cmd:previewAppearance', JSON.stringify({ ...app }));
}

/** Rotate buttons → same as mouse drag but 45° snap — no longer needed
 *  since render loop handles orbit. Kept for UX discoverability. */
function rotate(dir: number): void {
  // Signal a synthetic drag: adjust polar angle via the zoom/drag channel.
  // We mutate the orbit state indirectly by simulating rapid drag events.
  // This is a best-effort stub — the rotate buttons are now less important
  // since users have free mouse control.
  window.mp?.trigger('character:rotateCharacter', JSON.stringify(dir * 3)); // 3 × 15° = 45°
}

// ── Mouse drag — only start/stop signals (render loop reads mouse delta natively) ────
const isDragging = ref(false);

function onMouseDown(e: MouseEvent): void {
  if (e.button !== 0) return;
  isDragging.value = true;
  window.mp?.trigger('character:startDrag');
}

function onMouseUp(): void {
  if (!isDragging.value) return;
  isDragging.value = false;
  window.mp?.trigger('character:stopDrag');
}

// ── Scroll wheel fallback (render loop also reads native scroll controls) ────────
function onWheel(e: WheelEvent): void {
  // deltaY is positive scrolling down, negative scrolling up.
  // Negate so scroll up = positive delta = zoom in (radius toward 0).
  const delta = -(e.deltaY / 100) * 0.1;
  window.mp?.trigger('character:cameraZoom', JSON.stringify(delta));
}

// ── Panel hover — suppress native scroll zoom while hovering the menu ─────────
function onPanelEnter(): void {
  window.mp?.trigger('character:panelHovered', 'true');
}
function onPanelLeave(): void {
  window.mp?.trigger('character:panelHovered', 'false');
}

// ── Keyboard — continuous rotation while arrow key held ─────────────────────────
// RAGE:MP CEF does not fire key-repeat events, so we use keydown/keyup
// to track held state and drive rotation with setInterval.
const keysHeld      = new Set<string>();
let   rotationTimer: ReturnType<typeof setInterval> | null = null;

function startRotation(): void {
  if (rotationTimer !== null) return; // already running
  rotationTimer = setInterval(() => {
    if (keysHeld.has('ArrowLeft'))  window.mp?.trigger('character:rotateCharacter', JSON.stringify(-1));
    if (keysHeld.has('ArrowRight')) window.mp?.trigger('character:rotateCharacter', JSON.stringify(1));
  }, 50); // ~20 rotations per second
}

function stopRotation(): void {
  if (rotationTimer !== null) {
    clearInterval(rotationTimer);
    rotationTimer = null;
  }
}

function onKey(e: KeyboardEvent): void {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  // Always prevent arrow key browser defaults regardless of rotation state
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    e.preventDefault();
  }

  if (e.key === 'Escape') cancel();
}

function onKeyDown(e: KeyboardEvent): void {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    e.preventDefault();
  }

  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    // Rotate immediately — don't wait for the 50ms interval tick
    const dir = e.key === 'ArrowLeft' ? -1 : 1;
    window.mp?.trigger('character:rotateCharacter', JSON.stringify(dir));

    keysHeld.add(e.key);
    startRotation(); // interval for continuous rotation while held
  }

  if (e.key === 'Escape') cancel();
}

function onKeyUp(e: KeyboardEvent): void {
  keysHeld.delete(e.key);
  if (keysHeld.size === 0) stopRotation();
}

// ── Tab change — notify client to refocus camera on correct body zone ────────
// Face tab → camera orbits head bone
// Clothing tab → camera orbits upper body bone
watch(activeTab, (tab) => {
  window.mp?.trigger('character:setCameraZone', JSON.stringify(tab));
});

/** After panel clicks, return keyboard focus to the game-area so arrow keys work. */
function refocusGameArea(e: MouseEvent): void {
  const tag = (e.target as HTMLElement)?.tagName;
  // Don't steal focus from inputs so the user can still type
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  gameAreaRef.value?.focus();
}

onMounted(() => {
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mouseup', refocusGameArea);
  // Capture phase so e.preventDefault() stops browser scroll/selection before
  // any element sees the event.
  window.addEventListener('keydown', onKeyDown, { capture: true });
  window.addEventListener('keyup',   onKeyUp,   { capture: true });
  gameAreaRef.value?.focus();
});

onUnmounted(() => {
  stopRotation();
  window.removeEventListener('mouseup', onMouseUp);
  window.removeEventListener('mouseup', refocusGameArea);
  window.removeEventListener('keydown', onKeyDown, { capture: true });
  window.removeEventListener('keyup',   onKeyUp,   { capture: true });
});

// ── Provide to panels ─────────────────────────────────────────────────────────
provide(APP_KEY,             app);
provide(PREVIEW_KEY,         preview);
provide(TOGGLE_OVERLAY_KEY,  toggleOverlay);

// ── Save / Cancel ─────────────────────────────────────────────────────────────
const saving   = ref(false);
const errorMsg = ref('');

async function submit(): Promise<void> {
  errorMsg.value = '';
  if (!firstName.value.trim() || !lastName.value.trim()) {
    errorMsg.value = 'Please fill in first and last name.';
    return;
  }
  saving.value = true;
  try {
    await rpc.callServer(
      'character:create',
      firstName.value.trim(),
      lastName.value.trim(),
      gender.value,
      { ...app },
    );
    window.mp?.trigger('cmd:showPage', 'character-select');
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'Server error.';
  } finally {
    saving.value = false;
  }
}

function cancel(): void {
  window.mp?.trigger('cmd:showPage', 'character-select');
}
</script>

<style scoped>
/* Root — fully transparent so game world shows through */
.cc-root {
  position: fixed; inset: 0;
  pointer-events: none;
  font-family: 'Inter', 'Segoe UI', sans-serif;
  user-select: none;
}

/* Left panel */
.cc-panel {
  pointer-events: auto;
  position: absolute; left: 0; top: 0; bottom: 0; width: 215px;
  background: rgba(8, 10, 20, 0.94);
  border-right: 1px solid rgba(255,255,255,0.07);
  display: flex; flex-direction: column; overflow: hidden;
}

/* Header */
.panel-header { padding: 14px 14px 0; flex-shrink: 0; }
.logo { line-height: 1; margin-bottom: 10px; }
.logo-main { display: block; font-size: 16px; font-weight: 900; color: #fff; letter-spacing: 0.1em; }
.logo-sub  { display: block; font-size: 9px; font-weight: 600; color: #4a6dff; letter-spacing: 0.25em; text-transform: uppercase; }
.rotate-row { display: flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 4px 8px; margin-bottom: 10px; }
.rot-btn { background: none; border: none; color: rgba(255,255,255,0.5); font-size: 14px; cursor: pointer; padding: 2px 4px; transition: color 0.15s; }
.rot-btn:hover { color: #8899ff; }
.rot-label { flex: 1; text-align: center; font-size: 9px; font-weight: 700; letter-spacing: 0.15em; color: rgba(255,255,255,0.3); }

/* Identity */
.id-strip { padding: 0 10px 8px; flex-shrink: 0; }
.id-input { width: 100%; box-sizing: border-box; padding: 6px 9px; margin-bottom: 5px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 5px; color: #f0f4ff; font-size: 12px; outline: none; transition: border-color 0.15s; }
.id-input:focus { border-color: rgba(74,109,255,0.5); }
.id-input::placeholder { color: rgba(255,255,255,0.2); }
.gender-row { display: flex; gap: 5px; }
.gndr { flex: 1; padding: 5px; border-radius: 5px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.4); font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.gndr:hover { background: rgba(255,255,255,0.08); }
.gndr.active { background: rgba(74,109,255,0.18); border-color: rgba(74,109,255,0.4); color: #8899ff; }

/* Tab bar */
.tab-bar { display: flex; border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; }
.tab-btn { flex: 1; padding: 8px 0 6px; background: none; border: none; border-right: 1px solid rgba(255,255,255,0.06); color: rgba(255,255,255,0.3); cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 2px; transition: background 0.15s, color 0.15s; }
.tab-btn:last-child { border-right: none; }
.tab-btn:hover { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.6); }
.tab-btn.active { background: rgba(74,109,255,0.12); color: #8899ff; border-bottom: 2px solid #4a6dff; }
.tab-ico { font-size: 16px; }
.tab-lbl { font-size: 9px; font-weight: 600; letter-spacing: 0.04em; }

/* Scroll */
.panel-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent; }
.panel-scroll::-webkit-scrollbar { width: 3px; }
.panel-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

/* Footer */
.panel-footer { flex-shrink: 0; border-top: 1px solid rgba(255,255,255,0.06); padding: 10px 12px; }
.err-bar { padding: 6px 9px; border-radius: 5px; margin-bottom: 8px; background: rgba(255,60,60,0.1); border: 1px solid rgba(255,60,60,0.2); color: #ff8080; font-size: 10px; }
.footer-row { display: flex; gap: 8px; }
.btn-cancel, .btn-save { flex: 1; padding: 9px 0; border: none; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: opacity 0.15s; }
.btn-cancel { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.55); }
.btn-cancel:hover { background: rgba(255,255,255,0.11); }
.btn-save { background: linear-gradient(135deg, #3a5bff, #5533ff); color: #fff; }
.btn-save:hover:not(:disabled) { opacity: 0.85; }
.btn-save:disabled { opacity: 0.45; cursor: not-allowed; }
.spin { width: 10px; height: 10px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Game area — transparent drag target right of the panel */
.game-area { position: absolute; left: 215px; top: 0; right: 0; bottom: 0; pointer-events: auto; cursor: grab; }
.game-area.dragging { cursor: grabbing; }

/* Camera hints */
.cam-hints { position: absolute; bottom: 20px; right: 20px; text-align: right; font-size: 11px; color: rgba(255,255,255,0.45); line-height: 1.7; pointer-events: none; text-shadow: 0 1px 4px rgba(0,0,0,0.8); }
.cam-title { font-weight: 700; color: rgba(255,255,255,0.7); margin-bottom: 2px; }
</style>
