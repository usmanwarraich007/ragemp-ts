import { playerStore } from './playerStore';
import { log } from './logger';
import { chatMessage } from './chatMessage';

interface CommandOptions {
  /** Usage string shown when minArgs is not met, e.g. '/setjob [id] [job]' */
  usage?: string;
  /** Minimum number of arguments required (after the player param). Default: 0 */
  minArgs?: number;
  /** Minimum admin level required to run this command. Default: 0 (everyone) */
  adminLevel?: number;
}

interface CommandEntry {
  fn:   (player: PlayerMp, ...args: string[]) => void;
  opts: CommandOptions;
}

/**
 * Central command registry — populated at startup by @Command decorators.
 * Keyed by lowercase command name.
 */
export const commandRegistry = new Map<string, CommandEntry>();

/**
 * Dispatch a command from the custom registry.
 * Called by the chat:command RPC handler when the player types /cmd in CEF.
 *
 * @returns ok=true on success, ok=false + error string on any failure.
 */
export function dispatchCommand(
  player:     PlayerMp,
  cmdName:    string,
  argsString: string,
): { ok: boolean; error?: string } {
  const entry = commandRegistry.get(cmdName.toLowerCase());

  if (!entry) {
    chatMessage(player, `Unknown command: /${cmdName}`, 'error');
    return { ok: false, error: `Unknown command: /${cmdName}` };
  }

  const { fn, opts } = entry;
  const { usage, minArgs = 0, adminLevel = 0 } = opts;

  // ── Admin level guard ──────────────────────────────────────────────────
  if (adminLevel > 0) {
    const data  = playerStore.get(player);
    const level = data?.account?.adminLevel ?? 0;
    if (level < adminLevel) {
      chatMessage(player, 'You don\'t have permission to use this command.', 'error');
      return { ok: false, error: 'Insufficient permissions.' };
    }
  }

  // ── Arg count guard ────────────────────────────────────────────────────
  const args = argsString ? argsString.split(' ').filter(Boolean) : [];
  if (args.length < minArgs) {
    const tip = usage ? `Usage: ${usage}` : 'Too few arguments.';
    chatMessage(player, tip, usage ? 'warning' : 'error');
    return { ok: false, error: usage ?? 'Too few arguments.' };
  }

  // ── Execute ────────────────────────────────────────────────────────────
  try {
    fn(player, ...args);
    return { ok: true };
  } catch (err) {
    log.error(`[Command:${cmdName}]`, 'Unhandled error', err);
    chatMessage(player, 'An internal error occurred.', 'error');
    return { ok: false, error: 'Internal error.' };
  }
}

/**
 * `@Command` decorator — registers a static method into the custom command registry.
 *
 * @example
 *   @Command('veh', { usage: '/veh [model]', minArgs: 1 })
 *   static spawnVehicle(player: PlayerMp, model: string) { ... }
 */
export function Command(name: string, opts: CommandOptions = {}) {
  return function (_target: unknown, _key: string, descriptor: PropertyDescriptor) {
    const original: (player: PlayerMp, ...args: string[]) => void = descriptor.value;
    commandRegistry.set(name.toLowerCase(), { fn: original, opts });
  };
}
