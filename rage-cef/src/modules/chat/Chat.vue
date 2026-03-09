<template>
  <Teleport to="body">
    <!-- Chat wrapper: always mounted, fades in/out based on visibility -->
    <Transition name="chat-fade">
      <div v-show="visible" class="chat-wrapper" :class="{ 'chat-focused': focused }">
        <!-- ── Tabs — absolutely positioned above the wrapper, zero flow impact ── -->
        <div v-show="focused" class="chat-tabs">
          <button
            v-for="tab in TABS"
            :key="tab.id"
            class="tab"
            :class="{ active: activeTab === tab.id }"
            @click="setTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- ── Messages ─────────────────────────────────────────────────── -->
        <div class="chat-messages" ref="scrollEl">
          <!-- Spacer pushes messages to the bottom when list is short -->
          <div class="messages-spacer" />
          <div class="messages-inner">
            <div
              v-for="msg in filteredMessages"
              :key="msg.id"
              class="message-content"
              :class="[`mode-${msg.mode}`, msg.distanceTier ? `tier-${msg.distanceTier}` : '']"
            >
              <!-- Timestamp -->
              <span v-if="showTimestamps" class="msg-ts">{{ formatTime(msg.timestamp) }}</span>

              <!-- Prefix tag -->
              <span v-if="modePrefix(msg)" class="msg-prefix" :style="{ color: modePrefixColor(msg) }">
                {{ modePrefix(msg) }}
              </span>

              <!-- Sender name -->
              <span v-if="msg.senderName" class="msg-sender" :style="{ color: senderColor(msg) }">
                {{ formatSenderName(msg) }}
              </span>

              <!-- Message body — supports color tags -->
              <span class="msg-body">
                <span v-for="(seg, i) in parseSegments(msg)" :key="i" :style="seg.color ? { color: seg.color } : {}">{{ seg.text }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- ── Tabs — below messages so hiding them never shifts content ── -->
        <div v-show="focused" class="chat-tabs">
          <button
            v-for="tab in TABS"
            :key="tab.id"
            class="tab"
            :class="{ active: activeTab === tab.id }"
            @click="setTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- ── Input box with inline ghost-text autocomplete ─────────────── -->
        <div v-if="focused" class="chat-input-wrapper">
          <!-- Ghost layer: typed part invisible + dimmed suffix sit behind input -->
          <div class="input-ghost" aria-hidden="true">
            <span class="ghost-typed">{{ inputText }}</span><span class="ghost-hint">{{ ghostSuffix }}</span>
          </div>
          <input
            ref="inputEl"
            v-model="inputText"
            class="chat-input"
            placeholder=""
            maxlength="256"
            @keydown="onKeyDown"
            @keyup.escape="closeInput"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue';
import { useRageEvent } from '@/composables/useRageEvent';
import { rpc } from '@/core/rpc';
import { parseColorTags } from './chatColors';
import { CHAT_COMMANDS } from './chat.commands';
import type { ChatMessage, ChatMode, ChatTab } from '@ragemp/shared';

// ── Tabs ───────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'all' as ChatTab, label: 'All' },
  { id: 'ic' as ChatTab, label: 'IC' },
  { id: 'ooc' as ChatTab, label: 'OOC' },
  { id: 'admin' as ChatTab, label: 'Admin' },
  { id: 'report' as ChatTab, label: 'Report' },
  { id: 'faction' as ChatTab, label: 'Faction' }
];

// ── State ──────────────────────────────────────────────────────────────────

const messages = ref<ChatMessage[]>([]);
const activeTab = ref<ChatTab>('all');
const focused = ref(false);
const visible = ref(false);
const showTimestamps = ref(false);
const inputText = ref('');
const sentHistory = ref<string[]>([]);
const historyIndex = ref(-1);
const autocompleteIndex = ref(0);

const scrollEl = ref<HTMLElement | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);

/** Timer handle for auto-hide after 8s of no new messages. */
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const MAX_MESSAGES = 200;
const HIDE_DELAY = 8000;

// ── Filtered messages ──────────────────────────────────────────────────────

const filteredMessages = computed(() => {
  if (activeTab.value === 'all') return messages.value;
  return messages.value.filter((m) => m.tab === activeTab.value);
});

// ── Autocomplete ───────────────────────────────────────────────────────────

const autocompleteItems = computed(() => {
  const text = inputText.value;
  if (!text.startsWith('/')) return [];
  const lower = text.toLowerCase();
  return CHAT_COMMANDS.filter((c) => c.command.startsWith(lower)).slice(0, 8);
});

// ── Ghost-text inline autocomplete ───────────────────────────────────────

/**
 * The top matching command for the current input.
 * e.g. input '/re' → '/report'
 */
const topSuggestion = computed(() => {
  const text = inputText.value;
  if (!text.startsWith('/') || text.length < 2) return '';
  const lower = text.toLowerCase();
  const match = CHAT_COMMANDS.find(
    (c) => c.command.startsWith(lower) && c.command !== lower,
  );
  return match ? match.command : '';
});

/**
 * Just the dimmed suffix to display after the typed text.
 * e.g. input '/re', topSuggestion '/report' → 'port'
 */
const ghostSuffix = computed(() =>
  topSuggestion.value ? topSuggestion.value.slice(inputText.value.length) : '',
);

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `[${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}]`;
}

function modePrefix(msg: ChatMessage): string {
  switch (msg.mode) {
    case 'admin':
      return '[ADMIN]';
    case 'radio':
      return '[RADIO]';
    case 'megaphone':
      return '[MEGAPHONE]';
    case 'advert':
      return '[ADVERT]';
    case 'ooc':
      return '(( OOC ))';
    default:
      return '';
  }
}

function modePrefixColor(msg: ChatMessage): string {
  switch (msg.mode) {
    case 'admin':
      return '#ff4444';
    case 'radio':
      return '#00ff9f';
    case 'megaphone':
      return '#ffffff';
    case 'advert':
      return '#f1ef5d';
    case 'ooc':
      return '#e67e22';
    default:
      return '';
  }
}

function senderColor(msg: ChatMessage): string {
  switch (msg.mode) {
    case 'me':
      return '#c8a2c8';
    case 'do':
      return '#c8a2c8'; // same as /me
    case 'ooc':
      return '#e67e22';
    case 'radio':
      return '#00ff9f';
    case 'admin':
      return '#ff4444';
    case 'advert':
      return '#f1ef5d';
    case 'megaphone':
      return '#ffffff';
    default:
      return '#55acee';
  }
}

function formatSenderName(msg: ChatMessage): string {
  if (!msg.senderName) return '';
  const id = msg.senderId !== undefined ? `(${msg.senderId})` : '';
  switch (msg.mode) {
    case 'me':
      return `* ${msg.senderName}${id}`;
    case 'shout':
      return `${msg.senderName}${id} (shouts):`;
    default:
      return `${msg.senderName}${id}:`;
  }
}

/** Default text color per mode (used as the base for parseColorTags). */
function defaultTextColor(msg: ChatMessage): string {
  if (msg.color) return msg.color;
  switch (msg.mode) {
    case 'say': {
      if (msg.distanceTier === 'far') return '#888888';
      if (msg.distanceTier === 'mid') return '#cccccc';
      return '#ffffff';
    }
    case 'shout':
      return '#ffffff';
    case 'whisper':
      return '#aaaaaa';
    case 'me':
      return '#c8a2c8'; // lilac
    case 'do':
      return '#c8a2c8'; // same as /me
    case 'ooc':
      return '#e67e22';
    case 'admin':
      return '#ff4444';
    case 'radio':
      return '#00ff9f';
    case 'megaphone':
      return '#ffffff';
    case 'advert':
      return '#f1ef5d';
    case 'system':
      return '#0099ff';
    default:
      return '#ffffff';
  }
}

function parseSegments(msg: ChatMessage) {
  // Full color override — no tag parsing needed
  if (msg.color && msg.mode !== 'advert') {
    return [{ text: msg.text, color: msg.color }];
  }
  return parseColorTags(msg.text, defaultTextColor(msg));
}

// ── Event handlers ─────────────────────────────────────────────────────────

function resetHideTimer(): void {
  if (hideTimer) clearTimeout(hideTimer);
  visible.value = true;
  if (!focused.value) {
    hideTimer = setTimeout(() => {
      if (!focused.value) visible.value = false;
    }, HIDE_DELAY);
  }
}

function setTab(tab: ChatTab): void {
  activeTab.value = tab;
}

function closeInput(): void {
  focused.value = false;
  inputText.value = '';
  historyIndex.value = -1;
  resetHideTimer();
  // Notify client to hide cursor
  (window as Window & { mp?: { trigger: (...a: unknown[]) => void } }).mp?.trigger('chat:blur');
}

/**
 * Parse the raw input string into a (mode, text) pair for RP chat commands.
 * Returns null if the input is an unrecognised slash command that should
 * be routed to the server @Command registry instead.
 */
function parseInput(raw: string): { mode: ChatMode; text: string } | null {
  const s = raw.trimStart();
  if (/^\/me\s+/i.test(s)) return { mode: 'me', text: s.replace(/^\/me\s+/i, '') };
  if (/^\/do\s+/i.test(s)) return { mode: 'do', text: s.replace(/^\/do\s+/i, '') };
  if (/^\/s(?:hout)?\s+/i.test(s)) return { mode: 'shout', text: s.replace(/^\/s(?:hout)?\s+/i, '') };
  if (/^\/w(?:hisper)?\s+/i.test(s)) return { mode: 'whisper', text: s.replace(/^\/w(?:hisper)?\s+/i, '') };
  if (/^\/b\s+/i.test(s)) return { mode: 'ooc', text: s.replace(/^\/b\s+/i, '') };
  if (/^\/am\s+/i.test(s)) return { mode: 'admin', text: s.replace(/^\/am\s+/i, '') };
  if (/^\/r\s+/i.test(s)) return { mode: 'radio', text: s.replace(/^\/r\s+/i, '') };
  if (/^\/m\s+/i.test(s)) return { mode: 'megaphone', text: s.replace(/^\/m\s+/i, '') };
  if (/^\/advert\s+/i.test(s)) return { mode: 'advert', text: s.replace(/^\/advert\s+/i, '') };
  // Not an RP command — caller should route to chat:command RPC
  if (s.startsWith('/')) return null;
  // Plain text → proximity say
  return { mode: 'say', text: s };
}

/** Show a local error message in the chat box. */
function showLocalError(text: string): void {
  messages.value.push({
    id: `err-${Date.now()}`,
    mode: 'system',
    tab: 'all',
    senderName: '',
    text,
    timestamp: new Date().toISOString(),
    color: '#ff4444'
  });
  resetHideTimer();
}

async function sendMessage(): Promise<void> {
  const raw = inputText.value.trim();
  if (!raw) {
    closeInput();
    return;
  }

  // Save to history
  sentHistory.value.unshift(raw);
  if (sentHistory.value.length > 50) sentHistory.value.pop();
  historyIndex.value = -1;

  inputText.value = '';
  closeInput(); // close immediately — don't wait for server round-trip

  const parsed = parseInput(raw);

  try {
    if (parsed === null) {
      // Unrecognised slash command — route through @Command registry.
      // Server handles all error display via chatMessage(), so we don't echo here.
      await rpc.callServer('chat:command', raw);
    } else {
      // RP chat mode (say, /me, /do, /shout, etc.)
      if (!parsed.text) return;
      const result = await rpc.callServer('chat:sendMessage', parsed.mode, parsed.text);
      if (!result.ok && result.error) showLocalError(result.error);
    }
  } catch {
    // RPC timeout in dev (no live server) — silently ignore
  }
}

function selectAutocomplete(cmd: { command: string }): void {
  inputText.value = cmd.command + ' ';
  nextTick(() => inputEl.value?.focus());
}

function onKeyDown(e: KeyboardEvent): void {
  // ArrowRight — accept ghost-text suggestion (only when cursor is at end)
  if (e.key === 'ArrowRight' && ghostSuffix.value) {
    const input = inputEl.value;
    // Only accept when caret is already at the end of the text
    if (input && input.selectionStart === input.value.length) {
      e.preventDefault();
      inputText.value = topSuggestion.value + ' ';
      return;
    }
  }

  // Message history navigation
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    const next = historyIndex.value + 1;
    if (next < sentHistory.value.length) {
      historyIndex.value = next;
      inputText.value = sentHistory.value[next];
    }
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const prev = historyIndex.value - 1;
    if (prev < 0) {
      historyIndex.value = -1;
      inputText.value = '';
    } else {
      historyIndex.value = prev;
      inputText.value = sentHistory.value[prev];
    }
    return;
  }

  if (e.key === 'Enter') {
    void sendMessage();
  }
}

// ── Auto-scroll on new messages ───────────────────────────────────────────

watch(
  messages,
  async () => {
    await nextTick();
    if (scrollEl.value) {
      scrollEl.value.scrollTop = scrollEl.value.scrollHeight;
    }
  },
  { deep: true }
);

// ── Focus state ────────────────────────────────────────────────────────────

watch(focused, async (isFocused) => {
  if (isFocused) {
    visible.value = true;
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    await nextTick();
    inputEl.value?.focus();
  } else {
    resetHideTimer();
  }
});

// ── CEF EventBus wiring ───────────────────────────────────────────────────

useRageEvent('chat:message', (msg: ChatMessage) => {
  messages.value.push(msg);
  if (messages.value.length > MAX_MESSAGES) messages.value.shift();
  if (!focused.value) resetHideTimer();
});

useRageEvent('chat:focus', (active: boolean) => {
  focused.value = active;
});

onUnmounted(() => {
  if (hideTimer) clearTimeout(hideTimer);
});
</script>

<style scoped>
/* ── Root wrapper ─────────────────────────────────────────────────────────── */
.chat-wrapper {
  position: fixed;
  top: 35px;
  left: 30px;
  width: 580px;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', sans-serif;
  pointer-events: none;
  z-index: 100;
}

.chat-wrapper.chat-focused {
  pointer-events: auto;
}

/* ── Tabs ─────────────────────────────────────────────────────────────────── */
.chat-tabs {
  display: flex;
  gap: 6px;
  padding-bottom: 6px;
  flex-wrap: wrap;
  pointer-events: auto;
  /* Float above the wrapper without occupying flex space */
  position: absolute;
  top: 0;
  left: 0;
  transform: translateY(-100%);
}

.tab {
  background: rgba(0, 0, 0, 0.5);
  color: #cccccc;
  padding: 5px 14px;
  font-family: 'Inter', sans-serif;
  font-size: 0.68rem;
  text-transform: uppercase;
  font-weight: 800;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.2);
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.7);
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s,
    transform 0.1s,
    box-shadow 0.1s;
  letter-spacing: 0.05em;
}

.tab:hover {
  background: rgba(50, 50, 50, 0.75);
  color: #ffffff;
}

.tab.active {
  background: rgba(40, 40, 40, 0.9);
  color: #ffffff;
  border-color: #ffffff;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
  transform: translateY(-2px);
}

.ts-toggle {
  margin-left: auto;
  padding: 5px 10px;
  font-size: 0.7rem;
}

/* ── Messages area ────────────────────────────────────────────────────────── */
.chat-messages {
  height: 340px;
  overflow-y: scroll;
  /* Left scrollbar via RTL trick */
  direction: rtl;
  /* Flex column so spacer pushes messages to the bottom */
  display: flex;
  flex-direction: column;
}

/* Fills empty space above messages — collapses when content overflows */
.messages-spacer {
  flex: 1;
  min-height: 0;
}

.messages-inner {
  direction: ltr;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 12px 8px 12px;
}

/* Scrollbar */
.chat-messages::-webkit-scrollbar {
  width: 3px;
}
.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.6);
  visibility: hidden;
  border-radius: 2px;
}
.chat-messages:hover::-webkit-scrollbar-thumb {
  visibility: visible;
}

/* ── Individual message ───────────────────────────────────────────────────── */
.message-content {
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.4;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 1), 1px 1px 3px rgba(0, 0, 0, 0.8);
  letter-spacing: 0.05px;
  word-break: break-word;
}

/* Distance tier styling */
.tier-far {
  font-style: italic;
  opacity: 0.7;
}
.tier-mid {
  opacity: 0.85;
}

/* Mode-specific overrides */
.mode-shout {
  letter-spacing: 0.5px;
}
.mode-me {
  font-style: italic;
}
.mode-admin {
  font-weight: 900;
}
.mode-megaphone {
  font-size: 1rem;
  font-weight: 900;
}

.msg-ts {
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 400;
  margin-right: 6px;
  opacity: 0.7;
}

.msg-prefix {
  font-weight: 900;
  margin-right: 5px;
  font-size: 0.8rem;
  letter-spacing: 0.04em;
}

.msg-sender {
  font-weight: 800;
  margin-right: 5px;
}

/* ── Autocomplete ─────────────────────────────────────────────────────────── */

/* ── Input box ──────────────────────────────────────────────────── */
.chat-input-wrapper {
  position: relative; /* needed for ghost overlay */
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid #ffffff;
  padding: 12px 18px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.6);
  width: 95%;
}

/* Ghost layer sits behind the input, same font/size/padding */
.input-ghost {
  position: absolute;
  inset: 0;
  padding: 12px 18px;
  font-family: 'Inter', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  white-space: pre;
  pointer-events: none;
  display: flex;
  align-items: center;
  overflow: hidden;
}

/* Invisible spacer — holds the width of already-typed text */
.ghost-typed {
  color: transparent;
}

/* Dimmed suffix — the completion hint */
.ghost-hint {
  color: rgba(255, 255, 255, 0.35);
}

.chat-input {
  position: relative; /* sits above ghost */
  background: transparent;
  border: none;
  color: #ffffff;
  width: 100%;
  outline: none;
  font-family: 'Inter', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.7);
}

.chat-input::placeholder {
  color: #cccccc;
  font-weight: 400;
  opacity: 0.6;
}

/* ── Chat fade transition ─────────────────────────────────────────────────── */
.chat-fade-enter-active {
  transition: opacity 0.3s ease;
}
.chat-fade-leave-active {
  transition: opacity 0.6s ease;
}
.chat-fade-enter-from,
.chat-fade-leave-to {
  opacity: 0;
}

/* ── Autocomplete transition ──────────────────────────────────────────────── */
.autocomplete-fade-enter-active {
  transition:
    opacity 0.1s,
    transform 0.1s;
}
.autocomplete-fade-leave-active {
  transition:
    opacity 0.1s,
    transform 0.08s;
}
.autocomplete-fade-enter-from,
.autocomplete-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
