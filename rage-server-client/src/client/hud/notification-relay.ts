import { browserManager } from '../browser';
import type { NotificationPayload } from '@ragemp/shared';

/**
 * Notification relay — forwards server 'notify:show' events to the CEF.
 * Server calls: player.call('notify:show', [payload])
 * player.call() delivers args directly — no player param on the client side.
 */
mp.events.add('notify:show', (payload: NotificationPayload) => {
  browserManager.emit('notify', 'show', payload);
});
