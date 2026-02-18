<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

// Declare mp global for TypeScript
declare const mp: any;

const countdown = ref(7);
const animationSpeed = 5; // seconds
let countdownInterval: number | null = null;
const animationKey = ref(0); // Key to force re-render and restart animation

const startCountdown = () => {
  // Clear existing interval if any
  if (countdownInterval !== null) {
    clearInterval(countdownInterval);
  }
  
  // Reset countdown value
  countdown.value = 7;
  
  // Start new countdown timer
  countdownInterval = window.setInterval(() => {
    countdown.value--;
    if (countdown.value < 0) countdown.value = 7;
  }, (animationSpeed * 1000) / 7);
};

const restartAnimation = () => {
  // Increment the key to force Vue to re-render the circle element
  // This will restart the CSS animation from the beginning
  animationKey.value++;
  
  // Restart countdown timer
  startCountdown();
};

onMounted(() => {
  // Start countdown timer
  startCountdown();

  // Listen for reset event from RAGE:MP client
  // Using window event listener as mp.events might not be available in CEF context
  if (typeof mp !== 'undefined' && mp.events) {
    mp.events.add('progressBar:reset', restartAnimation);
  }
  
  // Also add a global function that can be called via browser.execute
  (window as any).resetProgressBar = restartAnimation;
});

onUnmounted(() => {
  if (countdownInterval !== null) {
    clearInterval(countdownInterval);
  }
  
  // Remove event listener
  if (typeof mp !== 'undefined' && mp.events) {
    mp.events.remove('progressBar:reset', restartAnimation);
  }
  
  // Clean up global function
  delete (window as any).resetProgressBar;
});
</script>

<template>
  <div class="progress-wrapper">
    <div class="progress-container">
      <svg viewBox="0 0 200 200">
        <!-- Background circle -->
        <circle class="progress-bg" cx="100" cy="100" r="90"></circle>

        <!-- Green target zone (left side, around 9 o'clock) -->
        <circle
          class="progress-green"
          cx="100"
          cy="100"
          r="90"
          stroke-dasharray="141.37 423.11"
          stroke-dashoffset="-141.37"
        ></circle>

        <!-- Blue progress line (animated) - key forces re-render to restart animation -->
        <circle :key="animationKey" class="progress-blue" cx="100" cy="100" r="90"></circle>
      </svg>

      <div class="counter">{{ countdown }}</div>
    </div>

    <div class="status">PRESS <span class="key-hint">SPACE</span> WHEN BLUE LINE IS IN THE GREEN ZONE</div>
  </div>
</template>

<style scoped>
.progress-wrapper {
  position: fixed;
  bottom: 230px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.progress-container {
  position: relative;
  width: 90px;
  height: 90px;
}

svg {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
}

.progress-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 20;
}

.progress-green {
  fill: none;
  stroke: rgb(195, 251, 160);
  stroke-width: 20;
  stroke-linecap: butt;
}

.progress-blue {
  fill: none;
  stroke: rgb(64, 173, 248);
  stroke-width: 20;
  stroke-linecap: butt;
  stroke-dasharray: 565.48;
  stroke-dashoffset: 565.48;
  animation: fillProgress 5s ease-in-out infinite;
}

@keyframes fillProgress {
  0% {
    stroke-dashoffset: 565.48;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

.counter {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2em;
  font-weight: bold;
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.5);
  color: white;
}

.status {
  background: rgba(255, 255, 255, 0.15);
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: bold;
  font-size: 0.85em;
  color: white;
  backdrop-filter: blur(10px);
  white-space: nowrap;
}

.key-hint {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  padding: 3px 8px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  margin: 0 3px;
}
</style>
