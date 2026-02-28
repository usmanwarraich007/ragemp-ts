<template>
  <div class="stat-rings">
    <!-- Mic activity -->
    <StatRing
      :value="store.stats.isMicActive ? 100 : 0"
      :color="micColor"
      :pulse="store.stats.isMicActive"
      icon="mic"
      label="Voice"
    />

    <!-- Health -->
    <StatRing
      :value="store.stats.health"
      color="#4caf50"
      icon="heart"
      label="Health"
    />

    <!-- Armor -->
    <StatRing
      :value="store.stats.armor"
      color="#f44336"
      icon="shield"
      label="Armor"
    />

    <!-- Hunger -->
    <StatRing
      :value="store.stats.hunger"
      color="#ff9800"
      icon="burger"
      label="Food"
      :warn="store.stats.hunger < 25"
    />

    <!-- Thirst / Water -->
    <StatRing
      :value="store.stats.thirst"
      color="#2196f3"
      icon="droplet"
      label="Water"
      :warn="store.stats.thirst < 25"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStatRingsStore } from './stat-rings.store';
import StatRing from './StatRing.vue';

const store = useStatRingsStore();

const micColor = computed(() =>
  store.stats.isMicActive ? '#ffffff' : 'rgba(255,255,255,0.3)'
);
</script>

<style scoped>
.stat-rings {
  position: fixed;
  bottom: 2rem;
  left: 2rem;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: flex-end;
  pointer-events: none;
}
</style>
