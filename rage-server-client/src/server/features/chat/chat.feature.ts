/**
 * chat/chat.feature.ts — Advanced RP chat system.
 *
 * Intercepts all player chat via `playerChat` event and routes through
 * proximity checks and command parsing before pushing to CEF.
 */
import { Command, Rpc, notify, dispatchCommand } from '../../core';
import { playerStore } from '../../core/playerStore';
import { log } from '../../core/logger';
import { Character } from '../auth/character.entity';
import type { ChatMessage, ChatMode, ChatTab } from '@ragemp/shared';

// ── Constants ──────────────────────────────────────────────────────────────

/** Radius in metres for each chat mode. */
const RADIUS: Record<string, number> = {
  say:       20,
  shout:     30,
  whisper:    2,
  me:        20,
  do:        20,
  ooc:       20,
  megaphone: 50,
};

const ADVERT_COST = 500;

/** Counter for unique message IDs. */
let msgCounter = 0;

// ── Helpers ────────────────────────────────────────────────────────────────

function makeId(): string {
  return `${Date.now()}-${++msgCounter}`;
}

function buildMessage(
  mode: ChatMode,
  tab:  ChatTab,
  senderName: string,
  text: string,
  extra?: Partial<ChatMessage>,
): ChatMessage {
  return {
    id: makeId(),
    mode,
    tab,
    senderName,
    text,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

/**
 * Calculate 3D distance between two RAGE:MP Vector3 positions.
 */
function distance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Push a message to all players within `radius` metres of `origin`.
 * For `say` mode, attaches a distanceTier so CEF can style muffled text.
 *
 * @param senderId — when set, the message sent to THAT player will have
 *   senderId stripped so they see their own name without an ID tag.
 */
function broadcastToRange(
  origin:     Vector3,
  radius:     number,
  msgBuilder: (dist: number) => ChatMessage,
  senderId?:  number,
): void {
  mp.players.forEach((p) => {
    const dist = distance(origin, p.position);
    if (dist <= radius) {
      const msg = msgBuilder(dist);
      // Strip senderId for the sender themselves — they don't need their own ID
      if (senderId !== undefined && p.id === senderId) {
        const { senderId: _omit, ...msgForSender } = msg;
        p.call('chat:message', [JSON.stringify(msgForSender)]);
      } else {
        p.call('chat:message', [JSON.stringify(msg)]);
      }
    }
  });
}

/**
 * Push a message to every connected player regardless of position.
 * Strips senderId for the sender themselves.
 */
function broadcastGlobal(msg: ChatMessage, senderId?: number): void {
  mp.players.forEach((p) => {
    if (senderId !== undefined && p.id === senderId) {
      const { senderId: _omit, ...msgForSender } = msg;
      p.call('chat:message', [JSON.stringify(msgForSender)]);
    } else {
      p.call('chat:message', [JSON.stringify(msg)]);
    }
  });
}

/**
 * Determine the visual distance tier for `say` mode proximity styling.
 */
function distanceTier(dist: number): 'near' | 'mid' | 'far' {
  if (dist <= 7)  return 'near';
  if (dist <= 15) return 'mid';
  return 'far';
}

/**
 * Guard: ensure the player has a logged-in character.
 * Returns the character name, or null if the guard fails.
 */
function requireCharacter(player: PlayerMp): string | null {
  const data = playerStore.get(player);
  if (!data?.character) {
    player.outputChatBox('!{FF4444}You must have an active character to chat.');
    return null;
  }
  return data.character.name;
}

// ── playerChat intercept ───────────────────────────────────────────────────

/**
 * Override RAGE:MP's native `playerChat` event so all T-key text goes
 * through our proximity system instead of the default chat bubble.
 */
mp.events.add('playerChat', (player: PlayerMp, text: string) => {
  const name = requireCharacter(player);
  if (!name) return;

  const origin = player.position;
  const msg = (dist: number): ChatMessage =>
    buildMessage('say', 'ic', name, text, { distanceTier: distanceTier(dist), senderId: player.id });

  broadcastToRange(origin, RADIUS.say, msg, player.id);
  log.info('[Chat]', `[SAY] ${name}: ${text}`);
});

// ── Chat Commands ──────────────────────────────────────────────────────────

class ChatCommands {

  // ── /me ────────────────────────────────────────────────────────────────

  @Command('me', { usage: '/me [action]', minArgs: 1 })
  static meAction(player: PlayerMp, ...parts: string[]): void {
    const name = requireCharacter(player);
    if (!name) return;

    const text  = parts.join(' ');
    const origin = player.position;

    broadcastToRange(origin, RADIUS.me, () =>
      buildMessage('me', 'ic', name, text, { senderId: player.id }),
    player.id);

    log.info('[Chat]', `[ME] ${name}: ${text}`);
  }

  // ── /do ────────────────────────────────────────────────────────────────

  @Command('do', { usage: '/do [description]', minArgs: 1 })
  static doDesc(player: PlayerMp, ...parts: string[]): void {
    const name = requireCharacter(player);
    if (!name) return;

    const text   = parts.join(' ');
    const origin = player.position;

    broadcastToRange(origin, RADIUS.do, () =>
      buildMessage('do', 'ic', name, text, { senderId: player.id }),
    player.id);

    log.info('[Chat]', `[DO] ${name}: ${text}`);
  }

  // ── /s  /shout ─────────────────────────────────────────────────────────

  @Command('s', { usage: '/s [text]', minArgs: 1 })
  static shout(player: PlayerMp, ...parts: string[]): void {
    ChatCommands._shout(player, parts.join(' '));
  }

  @Command('shout', { usage: '/shout [text]', minArgs: 1 })
  static shoutAlias(player: PlayerMp, ...parts: string[]): void {
    ChatCommands._shout(player, parts.join(' '));
  }

  private static _shout(player: PlayerMp, text: string): void {
    const name = requireCharacter(player);
    if (!name) return;
    broadcastToRange(player.position, RADIUS.shout, () =>
      buildMessage('shout', 'ic', name, text, { senderId: player.id }),
    player.id);

    log.info('[Chat]', `[SHOUT] ${name}: ${text}`);
  }

  // ── /w  /whisper ───────────────────────────────────────────────────────

  @Command('w', { usage: '/w [text]', minArgs: 1 })
  static whisper(player: PlayerMp, ...parts: string[]): void {
    ChatCommands._whisper(player, parts.join(' '));
  }

  @Command('whisper', { usage: '/whisper [text]', minArgs: 1 })
  static whisperAlias(player: PlayerMp, ...parts: string[]): void {
    ChatCommands._whisper(player, parts.join(' '));
  }

  private static _whisper(player: PlayerMp, text: string): void {
    const name = requireCharacter(player);
    if (!name) return;
    broadcastToRange(player.position, RADIUS.whisper, () =>
      buildMessage('whisper', 'ic', name, text, { senderId: player.id }),
    player.id);

    log.info('[Chat]', `[WHISPER] ${name}: ${text}`);
  }

  // ── /b  (local OOC) ────────────────────────────────────────────────────

  @Command('b', { usage: '/b [text]', minArgs: 1 })
  static ooc(player: PlayerMp, ...parts: string[]): void {
    const name = requireCharacter(player);
    if (!name) return;

    const text = parts.join(' ');
    broadcastToRange(player.position, RADIUS.ooc, () =>
      buildMessage('ooc', 'ooc', name, text, { senderId: player.id }),
    player.id);

  }

  // ── /am  (global admin message) ────────────────────────────────────────

  @Command('am', { usage: '/am [message]', minArgs: 1, adminLevel: 2 })
  static adminMessage(player: PlayerMp, ...parts: string[]): void {
    const name = requireCharacter(player);
    if (!name) return;

    const text = parts.join(' ');
    broadcastGlobal(buildMessage('admin', 'admin', name, text, { senderId: player.id }), player.id);
    log.info('[Chat]', `[ADMIN MSG] ${name}: ${text}`);
  }

  // ── /r  (faction radio) ────────────────────────────────────────────────

  @Command('r', { usage: '/r [text]', minArgs: 1 })
  static radio(player: PlayerMp, ...parts: string[]): void {
    const data = playerStore.get(player);
    const name = data?.character?.name;
    if (!name) {
      player.outputChatBox('!{FF4444}No active character.');
      return;
    }
    if (!data.character?.factionId) {
      player.outputChatBox('!{FF4444}You are not in a faction.');
      return;
    }

    const text       = parts.join(' ');
    const factionId  = data.character.factionId;

    mp.players.forEach((p) => {
      const pData = playerStore.get(p);
      if (pData?.character?.factionId === factionId) {
        p.call('chat:message', [
          JSON.stringify(buildMessage('radio', 'faction', name, text, { senderId: player.id })),
        ]);
      }
    });
    log.info('[Chat]', `[RADIO] Faction#${factionId} ${name}: ${text}`);
  }

  // ── /m  (megaphone) ────────────────────────────────────────────────────

  @Command('m', { usage: '/m [text]', minArgs: 1 })
  static megaphone(player: PlayerMp, ...parts: string[]): void {
    const data = playerStore.get(player);
    const name = data?.character?.name;
    if (!name) {
      player.outputChatBox('!{FF4444}No active character.');
      return;
    }

    // Guard: adminLevel ≥ 1 OR cop faction (factionId 1)
    const isAdmin = (data.account?.adminLevel ?? 0) >= 1;
    const isCop   = data.character?.factionId === 1;
    if (!isAdmin && !isCop) {
      player.outputChatBox('!{FF4444}You do not have access to a megaphone.');
      return;
    }

    const text = parts.join(' ');
    broadcastToRange(player.position, RADIUS.megaphone, () =>
      buildMessage('megaphone', 'ic', name, text, { senderId: player.id }),
    player.id);

    log.info('[Chat]', `[MEGAPHONE] ${name}: ${text}`);
  }

  // ── /advert  (paid advertisement) ─────────────────────────────────────
  // Handled via @Rpc below so the CEF can await a result before showing
  // a local confirmation. See Rpc 'chat:sendMessage'.

  @Command('advert', { usage: '/advert [text]', minArgs: 1 })
  static advertCommand(player: PlayerMp, ...parts: string[]): void {
    void ChatCommands._processAdvert(player, parts.join(' '));
  }

  // ── Generic slash-command relay from CEF ───────────────────────────────

  /**
   * Route any unrecognised `/command [args]` typed in our CEF input through
   * the RAGE:MP `playerCommand` event so all registered @Command decorators fire.
   *
   * rawInput examples:  "tpm"  |  "veh adder"  |  "aveh adder"
   */
  @Rpc('chat:command')
  static fireCommand(
    player:   PlayerMp,
    rawInput: string,
  ): { ok: boolean; error?: string } {
    const trimmed = rawInput.trim().replace(/^\/+/, '');
    if (!trimmed) return { ok: false, error: 'Empty command.' };

    const parts      = trimmed.split(/\s+/);
    const cmdName    = parts[0].toLowerCase();
    const argsString = parts.slice(1).join(' ');

    return dispatchCommand(player, cmdName, argsString);
  }

  @Rpc('chat:sendMessage')
  static async sendMessage(
    player: PlayerMp,
    mode:   ChatMode,
    text:   string,
  ): Promise<{ ok: boolean; error?: string }> {
    const data = playerStore.get(player);
    const name = data?.character?.name;
    if (!name) return { ok: false, error: 'No active character.' };

    const origin = player.position;

    switch (mode) {
      case 'say':
        broadcastToRange(origin, RADIUS.say, (dist) =>
          buildMessage('say', 'ic', name, text, { distanceTier: distanceTier(dist) }),
        );
        log.info('[Chat]', `[SAY] ${name}: ${text}`);
        break;

      case 'shout':
        broadcastToRange(origin, RADIUS.shout, () =>
          buildMessage('shout', 'ic', name, text),
        );
        log.info('[Chat]', `[SHOUT] ${name}: ${text}`);
        break;

      case 'whisper':
        broadcastToRange(origin, RADIUS.whisper, () =>
          buildMessage('whisper', 'ic', name, text),
        );
        log.info('[Chat]', `[WHISPER] ${name}: ${text}`);
        break;

      case 'me':
        broadcastToRange(origin, RADIUS.me, () =>
          buildMessage('me', 'ic', name, text),
        );
        log.info('[Chat]', `[ME] ${name}: ${text}`);
        break;

      case 'do':
        broadcastToRange(origin, RADIUS.do, () =>
          buildMessage('do', 'ic', name, text),
        );
        log.info('[Chat]', `[DO] ${name}: ${text}`);
        break;

      case 'ooc':
        broadcastToRange(origin, RADIUS.ooc, () =>
          buildMessage('ooc', 'ooc', name, text),
        );
        break;

      case 'admin': {
        const adminLevel = data.account?.adminLevel ?? 0;
        if (adminLevel < 2) return { ok: false, error: 'Insufficient permissions for /am.' };
        broadcastGlobal(buildMessage('admin', 'admin', name, text));
        log.info('[Chat]', `[ADMIN MSG] ${name}: ${text}`);
        break;
      }

      case 'radio': {
        const factionId = data.character?.factionId;
        if (!factionId) return { ok: false, error: 'You are not in a faction.' };
        mp.players.forEach((p) => {
          if (playerStore.get(p)?.character?.factionId === factionId) {
            p.call('chat:message', [JSON.stringify(buildMessage('radio', 'faction', name, text))]);
          }
        });
        log.info('[Chat]', `[RADIO] Faction#${factionId} ${name}: ${text}`);
        break;
      }

      case 'megaphone': {
        const isAdmin = (data.account?.adminLevel ?? 0) >= 1;
        const isCop   = data.character?.factionId === 1;
        if (!isAdmin && !isCop) return { ok: false, error: 'You do not have access to a megaphone.' };
        broadcastToRange(origin, RADIUS.megaphone, () =>
          buildMessage('megaphone', 'ic', name, text),
        );
        log.info('[Chat]', `[MEGAPHONE] ${name}: ${text}`);
        break;
      }

      case 'advert':
        return ChatCommands._processAdvert(player, text);

      default:
    }

    return { ok: true };
  }

  private static async _processAdvert(
    player: PlayerMp,
    text:   string,
  ): Promise<{ ok: boolean; error?: string }> {
    const data = playerStore.get(player);
    const char = data?.character;
    if (!char?.id) {
      player.outputChatBox('!{FF4444}No active character.');
      return { ok: false, error: 'No active character.' };
    }
    if ((char.cash ?? 0) < ADVERT_COST) {
      player.outputChatBox(`!{FF4444}You need $${ADVERT_COST} to place an advertisement.`);
      return { ok: false, error: `Insufficient funds. Need $${ADVERT_COST}.` };
    }

    // Deduct cost
    const newCash = char.cash - ADVERT_COST;
    await Character.update(char.id, { cash: newCash });
    playerStore.patch(player, { character: { ...char, cash: newCash } });

    broadcastGlobal(buildMessage('advert', 'all', char.name, text));
    player.outputChatBox(`!{f1ef5d}Advertisement posted! $${ADVERT_COST} deducted. Remaining: $${newCash.toLocaleString()}`);
    log.info('[Chat]', `[ADVERT] ${char.name}: ${text}`);
    return { ok: true };
  }
}

void ChatCommands;

// ── System message helper (exported for use in other features) ─────────────

/**
 * Send a system message to a specific player's chat box.
 * Color tags in `text` are supported.
 */
export function systemMessage(
  player:  PlayerMp,
  text:    string,
  color = '#0099ff',
): void {
  const msg = buildMessage('system', 'all', '', text, { color });
  player.call('chat:message', [JSON.stringify(msg)]);
}

/**
 * Broadcast a system message to all connected players.
 */
export function systemBroadcast(text: string, color = '#0099ff'): void {
  const msg = buildMessage('system', 'all', '', text, { color });
  broadcastGlobal(msg);
}
