/**
 * chat.commands.ts (CEF-side)
 *
 * Mirrors the server-side command registry for autocomplete purposes.
 * Keep this in sync with:
 *   rage-server-client/src/server/features/chat/chat.commands.ts
 *
 * Defined here rather than in rage-shared because it contains no runtime
 * logic — it's purely a UI concern for the autocomplete dropdown.
 */
import type { ChatCommand } from '@ragemp/shared';

export const CHAT_COMMANDS: readonly ChatCommand[] = [
  // ── Proximity IC ───────────────────────────────────────────────────────
  { command: '/me',     usage: '/me [action]',          hint: 'Character action',                  tab: 'ic'     },
  { command: '/do',     usage: '/do [description]',     hint: 'Scene / environment description',   tab: 'ic'     },
  { command: '/s',      usage: '/s [text]',              hint: 'Shout — broadcasts to 30 m',        tab: 'ic'     },
  { command: '/shout',  usage: '/shout [text]',          hint: 'Shout alias (/s)',                  tab: 'ic'     },
  { command: '/w',      usage: '/w [text]',              hint: 'Whisper — only heard within 2 m',   tab: 'ic'     },
  { command: '/whisper',usage: '/whisper [text]',        hint: 'Whisper alias (/w)',                tab: 'ic'     },
  { command: '/m',      usage: '/m [text]',              hint: 'Megaphone (law enforcement only)',  tab: 'ic'     },

  // ── OOC ────────────────────────────────────────────────────────────────
  { command: '/b',      usage: '/b [text]',              hint: 'Local OOC',                         tab: 'ooc'    },

  // ── Admin ──────────────────────────────────────────────────────────────
  { command: '/am',     usage: '/am [message]',          hint: 'Global admin broadcast',            tab: 'admin', adminOnly: true },

  // ── Faction ────────────────────────────────────────────────────────────
  { command: '/r',      usage: '/r [text]',              hint: 'Faction radio',                     tab: 'faction'},

  // ── Advertisements ─────────────────────────────────────────────────────
  { command: '/advert', usage: '/advert [text]',         hint: 'Paid global ad ($500). Supports {color} tags.', tab: 'all' },
];
