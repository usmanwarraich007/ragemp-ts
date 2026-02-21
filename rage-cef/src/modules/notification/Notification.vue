<template>
  <Teleport to="body">
    <div class="notif-wrapper">
      <TransitionGroup name="notif" tag="div" class="notif-stack">
        <div
          v-for="notif in store.queue"
          :key="notif.id"
          class="notif-bar"
          :class="notif.type"
          @click="store.dismiss(notif.id)"
        >
          <!-- Coloured icon tile -->
          <div class="notif-icon-tile">
            <div class="notif-icon-badge">
              <span class="notif-icon">{{ icons[notif.type] }}</span>
            </div>
          </div>
          <!-- Message -->
          <span class="notif-text">{{ notif.message }}</span>

          <!-- Progress bar at bottom -->
          <div
            class="notif-progress"
            :style="{ animationDuration: notif.duration + 'ms' }"
            @animationend="store.dismiss(notif.id)"
          />
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useNotificationStore, type NotificationType } from './notification.store';

const store = useNotificationStore();

const icons: Record<NotificationType, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
  warning: '⚠',
};
</script>

<style scoped>
.notif-wrapper {
  position: fixed;
  top: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.notif-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

/* ── Bar ── */
.notif-bar {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 280px;
  max-width: 520px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
  pointer-events: auto;
  cursor: pointer;
  background: rgba(12, 14, 18, 0.92);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.55);
  user-select: none;
  font-family: 'Inter', 'Segoe UI', sans-serif;
}

/* ── Icon tile ── */
.notif-icon-tile {
  flex-shrink: 0;
  width: 46px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notif-bar.success .notif-icon-tile { background: rgba(68, 255, 136, 0.12); }
.notif-bar.error   .notif-icon-tile { background: rgba(255, 68, 68, 0.12);  }
.notif-bar.info    .notif-icon-tile { background: rgba(68, 136, 255, 0.15); }
.notif-bar.warning .notif-icon-tile { background: rgba(255, 170, 0, 0.12);  }

/* Circular badge — centered in tile */
.notif-icon-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.notif-bar.success .notif-icon-badge { background: rgba(68, 255, 136, 0.18); border: 1px solid rgba(68,255,136,0.45); }
.notif-bar.error   .notif-icon-badge { background: rgba(255, 68, 68, 0.18);  border: 1px solid rgba(255,68,68,0.45);  }
.notif-bar.info    .notif-icon-badge { background: rgba(68, 136, 255, 0.22); border: 1px solid rgba(80,150,255,0.55); }
.notif-bar.warning .notif-icon-badge { background: rgba(255, 170, 0, 0.18);  border: 1px solid rgba(255,170,0,0.45);  }

.notif-icon {
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}
.notif-bar.success .notif-icon { color: #44ff88; }
.notif-bar.error   .notif-icon { color: #ff4444; }
.notif-bar.info    .notif-icon { color: #7aacff; }
.notif-bar.warning .notif-icon { color: #ffaa00; }

/* ── Separator ── */
.notif-sep {
  width: 1px;
  height: 60%;
  flex-shrink: 0;
  opacity: 0.25;
  background: #fff;
}

/* ── Text ── */
.notif-text {
  flex: 1;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.015em;
  color: #e8eaf0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Progress bar ── */
.notif-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  width: 100%;
  transform-origin: left;
  animation: shrink linear forwards;
  background: rgba(255, 255, 255, 0.20);
}

@keyframes shrink {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}

/* ── Transitions ── */
.notif-enter-active { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
.notif-leave-active { transition: all 0.18s ease; position: absolute; }
.notif-enter-from   { opacity: 0; transform: translateY(-8px) scaleY(0.92); }
.notif-leave-to     { opacity: 0; transform: translateY(-4px); }
.notif-move         { transition: transform 0.2s ease; }
</style>
