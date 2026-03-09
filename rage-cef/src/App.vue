<template>
  <!-- Transparent full-screen overlay. Three co-existing UI layers. -->
  <div id="cef-root">

    <!-- ── Layer 1: World HUD — hidden when a full-screen page is open ──── -->
    <div v-show="pageStore.showHud" id="hud-layer">
      <Speedometer />
      <StatRings />
    </div>

    <!-- ── Layer 2: Full-screen page module ─────────────────────────────── -->
    <Transition name="page" mode="out-in">
      <component
        :is="activeModule"
        v-if="activeModule"
        :key="pageStore.currentPage"
        :data="pageStore.currentPageData"
      />
    </Transition>

    <!-- ── Layer 3: Popup / modal — floats above page ───────────────────── -->
    <Transition name="popup">
      <component
        :is="activePopup"
        v-if="activePopup"
        :key="pageStore.currentPopup"
        :data="pageStore.currentPopupData"
      />
    </Transition>

    <!-- ── Persistent overlays — always rendered regardless of layer ──── -->
    <Notification />
    <Chat />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getModule } from '@/core';
import { usePageStore } from '@/stores/page.store';
import Speedometer   from '@/modules/speedometer/Speedometer.vue';
import Notification  from '@/modules/notification/Notification.vue';
import StatRings     from '@/modules/stat-rings/StatRings.vue';
import Chat          from '@/modules/chat/Chat.vue';

// Load all modules — triggers self-registration via createModule()
import '@/modules';

const pageStore   = usePageStore();
const activeModule = computed(() => getModule(pageStore.currentPage));
const activePopup  = computed(() => getModule(pageStore.currentPopup));
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

/* Re-enable interaction on module/popup root elements */
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

/* Popup transition — slightly faster, scales in */
.popup-enter-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.popup-leave-active {
  transition: opacity 0.1s ease, transform 0.08s ease;
}
.popup-enter-from,
.popup-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>
