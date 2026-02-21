import { defineStore } from 'pinia';
import { ref } from 'vue';
import { eventBus } from '@/core';

/**
 * Pinia store that tracks the currently visible CEF module/page.
 *
 * The active page is set by the game client via:
 *   mp.trigger("cef::event", "system:setPage", '"hello-world"')
 *
 * In dev, simulate with:
 *   window.callHandler("system:setPage", JSON.stringify("hello-world"))
 */
export const usePageStore = defineStore('page', () => {
  const currentPage = ref<string | null>(null);

  function setPage(name: string | null): void {
    currentPage.value = name;
  }

  // Register the inbound CEF event once when the store is first used
  eventBus.on('system:setPage', (name) => setPage(name));

  return { currentPage, setPage };
});
