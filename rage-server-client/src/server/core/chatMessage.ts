/**
 * chatMessage — server-side helper for pushing messages into the CEF chat box.
 *
 * The native RAGE:MP chatbox is globally hidden, so all in-chat feedback
 * MUST go through this utility instead of player.outputChatBox().
 *
 * Usage:
 *   chatMessage(player, 'Vehicle spawned.');               // neutral white
 *   chatMessage(player, 'No permission.', 'error');        // red
 *   chatMessage(player, 'Teleported!',    'success');      // green
 *   chatMessage(player, 'Usage: /veh [model]', 'warning'); // amber
 */

import type { ChatMessage, ChatMode, ChatTab } from '@ragemp/shared';

type MsgLevel = 'success' | 'error' | 'info' | 'warning' | 'white';

const LEVEL_COLORS: Record<MsgLevel, string> = {
  success: '#44FF88',
  error:   '#FF4444',
  info:    '#44AAFF',
  warning: '#FFAA00',
  white:   '#ffffff',
};

let _id = 0;

/**
 * Send a system message to a single player's CEF chat box.
 *
 * @param player  - The recipient player.
 * @param text    - Message text (no RAGE:MP colour tags needed).
 * @param level   - Semantic colour level. Defaults to 'white'.
 * @param tab     - Which chat tab to post to. Defaults to 'all'.
 */
export function chatMessage(
  player: PlayerMp,
  text:   string,
  level:  MsgLevel = 'white',
  tab:    ChatTab  = 'all',
): void {
  const msg: ChatMessage = {
    id:         `sys-${Date.now()}-${++_id}`,
    mode:       'system' as ChatMode,
    tab,
    senderName: '',
    text,
    timestamp:  new Date().toISOString(),
    color:      LEVEL_COLORS[level],
  };
  player.call('chat:message', [JSON.stringify(msg)]);
}
