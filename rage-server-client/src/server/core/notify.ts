/**
 * notify — server-side player notification helper.
 *
 * Chat (native outputChatBox):
 *   notify(player).success('Vehicle spawned');
 *   notify(player).error('No permission');
 *   notify(player).info('Admin level: 2');
 *   notify(player).warning('Low health!');
 *
 * Screen (top-center CEF toast):
 *   notify(player).screen.success('Logged in!');
 *   notify(player).screen.error('Wrong password');
 *   notify(player).screen.info('Server restarting in 5m');
 *   notify(player).screen.warning('You are wanted!', 6000);
 */

import type { NotificationPayload } from '@ragemp/shared';
import { chatMessage } from './chatMessage';

type NotifyType = NotificationPayload['type'];

function chat(player: PlayerMp, type: NotifyType, message: string): void {
  chatMessage(player, message, type);
}

function screen(player: PlayerMp, type: NotifyType, message: string, duration = 4000): void {
  const payload: NotificationPayload = { type, message, duration };
  player.call('notify:show', [payload]);
}

export function notify(player: PlayerMp) {
  return {
    // ── Chat (bottom-left native chatbox) ──────────────────────────────────
    success: (msg: string) => chat(player, 'success', msg),
    error:   (msg: string) => chat(player, 'error',   msg),
    info:    (msg: string) => chat(player, 'info',    msg),
    warning: (msg: string) => chat(player, 'warning', msg),

    // ── Screen (top-center CEF toast) ──────────────────────────────────────
    screen: {
      success: (msg: string, duration?: number) => screen(player, 'success', msg, duration),
      error:   (msg: string, duration?: number) => screen(player, 'error',   msg, duration),
      info:    (msg: string, duration?: number) => screen(player, 'info',    msg, duration),
      warning: (msg: string, duration?: number) => screen(player, 'warning', msg, duration),
    },
  };
}
