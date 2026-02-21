<template>
  <div class="hello-world">
    <h1>Hello World</h1>
    <p>Speed: {{ speed }}</p>
    <button @click="sendTest">Send to client</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRageEvent, useRage } from '@/composables';

const speed = ref(0);
const { toClient } = useRage();

// Listen for speed updates pushed from the game client
useRageEvent('hud:setVehicleData', (data) => {
  if (data.key === 'speed') {
    speed.value = data.data as number;
  }
});

function sendTest(): void {
  toClient('hello', 'test', { message: 'Hello from CEF!' });
}

</script>

<style scoped>
.hello-world {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: white;
  gap: 1rem;
}

button {
  padding: 0.5rem 1.5rem;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background: rgba(255, 255, 255, 0.25);
}
</style>
