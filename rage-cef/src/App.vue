<template>
  <!-- Transparent full-screen overlay. Modules render inside here. -->
  <div id="cef-root">
    <!-- Persistent HUD overlays — always mounted, visibility controlled internally -->
    <Speedometer />

    <!-- Page-based modules — switched in/out via setPage -->
    <Transition name="page" mode="out-in">
      <component
        :is="activeModule"
        v-if="activeModule"
        :key="pageStore.currentPage"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getModule } from '@/core';
import { usePageStore } from '@/stores/page.store';
import Speedometer from '@/modules/speedometer/Speedometer.vue';

// Load all modules — triggers self-registration via createModule()
import '@/modules';

const pageStore = usePageStore();
const activeModule = computed(() => getModule(pageStore.currentPage));
</script>

<style>
#cef-root {
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  overflow: hidden;
  pointer-events: none; /* pass-through by default */
}

/* Re-enable interaction on module root elements */
#cef-root > * {
  pointer-events: auto;
}

/* Page transition */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.15s ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>
