<template>
  <!-- Exact same structure as hud1.html stat-circle -->
  <div class="stat-circle" :class="[icon, { 'ring-warn': warn, 'ring-pulse': pulse }]" :style="ringStyle">
    <div class="stat-inner">
      <i :class="faClass"></i>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  value: number;   // 0–100
  color: string;
  icon: 'mic' | 'heart' | 'shield' | 'burger' | 'droplet';
  warn?: boolean;
  pulse?: boolean;
}>();

const faClass = computed(() => {
  const map: Record<string, string> = {
    mic:     'fas fa-microphone',
    heart:   'fas fa-heart',
    shield:  'fas fa-shield-halved',
    burger:  'fas fa-burger',
    droplet: 'fas fa-droplet',
  };
  return map[props.icon];
});

/** conic-gradient: value 0–100 → 0–360deg */
const degrees = computed(() => Math.round((props.value / 100) * 360));

const ringStyle = computed(() => ({
  background: `conic-gradient(${props.color} ${degrees.value}deg, #555 0deg)`,
}));
</script>

<style scoped>
/* ── Direct port of hud1.html ─────────────────────────────────────── */
.stat-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  position: relative;
  margin: 5px;
  transition: background 0.4s ease;
}

/* Inner black core */
.stat-inner {
  width: 44px;
  height: 44px;
  background-color: #1a1a1a;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-size: 1.2rem;
  z-index: 2;
}

/* Depth shadow — same as hud1.html ::after */
.stat-circle::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow: inset 0 0 5px rgba(0,0,0,0.5);
}

/* Low value — amber warning glow */
.ring-warn {
  filter: drop-shadow(0 0 6px rgba(255, 152, 0, 0.7));
}

/* Mic active — pulse */
.ring-pulse {
  animation: mic-pulse 1.4s ease-in-out infinite;
}

@keyframes mic-pulse {
  0%, 100% { filter: drop-shadow(0 0 3px rgba(255,255,255,0.3)); }
  50%       { filter: drop-shadow(0 0 10px rgba(255,255,255,0.9)); }
}
</style>
