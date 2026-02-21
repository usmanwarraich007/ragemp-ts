import { playerStore } from './playerStore';
import { log } from './logger';

interface CommandOptions {
  /** Usage string shown when minArgs is not met, e.g. '/setjob [id] [job]' */
  usage?: string;
  /** Minimum number of arguments required (after the player param). Default: 0 */
  minArgs?: number;
  /** Minimum admin level required to run this command. Default: 0 (everyone) */
  adminLevel?: number;
}

/**
 * `@Command` decorator — registers a static method as a RAGE:MP command.
 *
 * Usage:
 *   @Command('veh', { usage: '/veh [model]', minArgs: 1 })
 *   static spawnVehicle(player: PlayerMp, model: string) { ... }
 *
 *   @Command('setjob', { usage: '/setjob [id] [job]', minArgs: 2, adminLevel: 3 })
 *   static setJob(player: PlayerMp, targetId: string, job: string) { ... }
 */
export function Command(name: string, opts: CommandOptions = {}) {
  const { usage, minArgs = 0, adminLevel = 0 } = opts;

  return function (_target: unknown, _key: string, descriptor: PropertyDescriptor) {
    const original: (player: PlayerMp, ...args: string[]) => void = descriptor.value;

    mp.events.addCommand(name, (player: PlayerMp, _fullText: string, ...args: string[]) => {
      // ── Admin level guard ──────────────────────────────────────────────
      if (adminLevel > 0) {
        const level = playerStore.get(player).account?.adminLevel ?? 0;
        if (level < adminLevel) {
          player.outputChatBox(`!{FF4444}You don't have permission to use this command.`);
          return;
        }
      }

      // ── Arg count guard ────────────────────────────────────────────────
      if (args.length < minArgs) {
        const tip = usage ? `!{FFAA00}Usage: ${usage}` : `!{FF4444}Too few arguments.`;
        player.outputChatBox(tip);
        return;
      }

      // ── Run the command ────────────────────────────────────────────────
      try {
        original(player, ...args);
      } catch (err) {
        log.error(`[Command:${name}]`, 'Unhandled error', err);
        player.outputChatBox('!{FF4444}An internal error occurred.');
      }
    });
  };
}
