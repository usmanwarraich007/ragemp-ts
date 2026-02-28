import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { eventBus } from '@/core';

/**
 * Central UI state store.
 *
 * Three co-existing layers:
 *   1. HUD         — world overlays (speedometer, health bar, etc.)
 *                    visible unless suppressHud is true
 *   2. Page        — full-screen module (auth, inventory, phone...)
 *                    replaces HUD when open (unless suppressHud is false)
 *   3. Popup       — modal floated above the active page
 *
 * Client controls via client script → CEF events:
 *   mp.trigger('cef::event', 'system:setPage', JSON.stringify({ page: 'inventory', data: {...} }))
 *   mp.trigger('cef::event', 'system:setPopup', JSON.stringify({ popup: 'confirm', data: {...} }))
 *   mp.trigger('cef::event', 'system:clearPopup', '')
 *   mp.trigger('cef::event', 'system:setHudVisible', 'false')
 *
 * In dev, simulate with:
 *   window.callHandler('system:setPage', JSON.stringify({ page: 'hello-world' }))
 */
export const usePageStore = defineStore('page', () => {
  // ── Layer 1: HUD ─────────────────────────────────────────────────────────
  const hudVisible   = ref(true);
  const suppressHud  = ref(false);  // set by page system when a full-screen page opens
  const showHud      = computed(() => hudVisible.value && !suppressHud.value);

  // ── Layer 2: Page ─────────────────────────────────────────────────────────
  const currentPage  = ref<string | null>(null);
  const currentPageData = ref<unknown>(null);

  // ── Layer 3: Popup ───────────────────────────────────────────────────────
  const currentPopup     = ref<string | null>(null);
  const currentPopupData = ref<unknown>(null);

  // ── Inbound event handlers ───────────────────────────────────────────────

  eventBus.on('system:setPage', (payload) => {
    currentPage.value      = payload.page;
    currentPageData.value  = payload.data ?? null;
    suppressHud.value      = payload.suppressHud ?? (payload.page !== null);
    // Opening a page always clears any existing popup
    currentPopup.value     = null;
    currentPopupData.value = null;
  });

  eventBus.on('system:setPopup', (payload) => {
    currentPopup.value     = payload.popup;
    currentPopupData.value = payload.data ?? null;
  });

  eventBus.on('system:clearPopup', () => {
    currentPopup.value     = null;
    currentPopupData.value = null;
  });

  eventBus.on('system:setHudVisible', (visible) => {
    hudVisible.value = visible;
  });

  return {
    // HUD
    showHud,
    hudVisible,
    // Page
    currentPage,
    currentPageData,
    // Popup
    currentPopup,
    currentPopupData,
  };
});
