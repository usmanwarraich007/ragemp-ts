/**
 * dev/debug.commands.ts — Developer/debug commands.
 * These are NOT admin commands — they are dev-only tools for smoke testing.
 * Remove or gate with NODE_ENV check before going live.
 */
import { Command, notify } from '../../core';

class DebugCommands {
  @Command('testnotify', { usage: '/testnotify [success|error|info|warning] [message]', minArgs: 1 })
  static test(player: PlayerMp, type: string, ...words: string[]): void {
    const msg = words.join(' ') || 'Test notification from server';
    const t = (['success', 'error', 'info', 'warning'].includes(type) ? type : 'info') as 'info';
    notify(player).screen[t](msg);
  }
}

void DebugCommands;
