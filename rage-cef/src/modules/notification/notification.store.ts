import { defineStore } from 'pinia';
import { ref } from 'vue';
import { eventBus } from '@/core';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: number;
  type: NotificationType;
  message: string;
  duration: number; // ms
}

let _nextId = 0;

export const useNotificationStore = defineStore('notifications', () => {
  const queue = ref<Notification[]>([]);

  function push(type: NotificationType, message: string, duration = 4000): void {
    queue.value.push({ id: _nextId++, type, message, duration });
  }

  function dismiss(id: number): void {
    const idx = queue.value.findIndex((n) => n.id === id);
    if (idx !== -1) queue.value.splice(idx, 1);
  }

  // Listen for server→CEF events
  eventBus.on('notify:show', (payload) => {
    const p = payload as { type: NotificationType; message: string; duration?: number };
    push(p.type, p.message, p.duration);
  });

  return { queue, push, dismiss };
});
