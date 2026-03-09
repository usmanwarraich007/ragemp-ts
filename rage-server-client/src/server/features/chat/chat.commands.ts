import type { ChatCommand } from '@ragemp/shared';


/**
 * Centralized command registry — single source of truth for all chat commands.
 * Imported directly by the CEF autocomplete UI so no RPC is needed.
 * Add new commands here; they automatically appear in the in-game autocomplete.
 */
export const CHAT_COMMANDS: readonly ChatCommand[] = [
  // ── Proximity IC ─────────────────────────────────────────────────────────
  {
    command: '/me',
    usage:   '/me [action]',
    hint:    'Character action (e.g. reaches for his wallet)',
    tab:     'ic',
  },
  {
    command: '/do',
    usage:   '/do [description]',
    hint:    'Scene/environment description (e.g. The room smells like coffee)',
    tab:     'ic',
  },
  {
    command: '/s',
    usage:   '/s [text]',
    hint:    'Shout — broadcasts to 30 m radius',
    tab:     'ic',
  },
  {
    command: '/shout',
    usage:   '/shout [text]',
    hint:    'Shout — broadcasts to 30 m radius (alias of /s)',
    tab:     'ic',
  },
  {
    command: '/w',
    usage:   '/w [text]',
    hint:    'Whisper — only heard within 2 m',
    tab:     'ic',
  },
  {
    command: '/whisper',
    usage:   '/whisper [text]',
    hint:    'Whisper — only heard within 2 m (alias of /w)',
    tab:     'ic',
  },
  {
    command: '/m',
    usage:   '/m [text]',
    hint:    'Megaphone — large-radius broadcast for law enforcement',
    tab:     'ic',
  },

  // ── Out-of-Character ──────────────────────────────────────────────────────
  {
    command: '/b',
    usage:   '/b [text]',
    hint:    'Local OOC — talk to nearby players out of character',
    tab:     'ooc',
  },

  // ── Admin ─────────────────────────────────────────────────────────────────
  {
    command: '/am',
    usage:   '/am [message]',
    hint:    'Global admin broadcast (admin only)',
    tab:     'admin',
    adminOnly: true,
  },

  // ── Faction ───────────────────────────────────────────────────────────────
  {
    command: '/r',
    usage:   '/r [text]',
    hint:    'Faction radio — same faction members only',
    tab:     'faction',
  },

  // ── Advertisements ────────────────────────────────────────────────────────
  {
    command: '/advert',
    usage:   '/advert [text]',
    hint:    'Paid global advertisement ($500). Supports {color} tags.',
    tab:     'all',
  },
] as const;
