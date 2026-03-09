/**
 * Shared chat types — used by server, client, and CEF.
 */

/** Which tab a message belongs to for filtering in the CEF chat UI. */
export type ChatTab = 'all' | 'ic' | 'ooc' | 'admin' | 'report' | 'faction';

/** The communication mode/type of a chat message. */
export type ChatMode =
  | 'say'       // Default IC proximity chat (plain text)
  | 'shout'     // /s or /shout — 30m radius
  | 'whisper'   // /w or /whisper — 2m radius
  | 'me'        // /me — character action
  | 'do'        // /do — scene description
  | 'ooc'       // /b — local out‑of‑character
  | 'admin'     // /am — global admin broadcast
  | 'radio'     // /r — faction radio (same factionId only)
  | 'megaphone' // /m — large‑radius police megaphone
  | 'advert'    // /advert — paid global advertisement
  | 'system';   // Server system messages (welcome, rewards, etc.)

/**
 * A single chat message payload pushed from server → client → CEF.
 * The `text` field may contain {name} or {RRGGBB} color tags for rendering.
 */
export interface ChatMessage {
  /** Unique message identifier (timestamp + counter is fine). */
  id: string;
  mode: ChatMode;
  /** Primary tab this message belongs to for filtering. */
  tab: ChatTab;
  /**
   * Character full name for IC/faction messages.
   * Empty string for system or admin broadcast messages where name is implicit.
   */
  senderName: string;
  /** RAGE:MP player.id of the sender. Displayed as Name(ID): in chat. */
  senderId?: number;
  /**
   * Raw text content. May include {colorName} or {RRGGBB} tags.
   * Example: "{blue}Selling {white}a house in {2ecc71}Vinewood"
   */
  text: string;
  /** ISO 8601 timestamp — formatted in CEF as [HH:MM:SS] when toggled. */
  timestamp: string;
  /**
   * Optional hex color override for the entire message (e.g. system msgs).
   * When present, color tags inside `text` are ignored.
   */
  color?: string;
  /**
   * Proximity distance bucket for `say` mode — used in CEF to apply the
   * correct muffled styling. Not set for non-proximity modes.
   */
  distanceTier?: 'near' | 'mid' | 'far';
}

/**
 * Chat command descriptor — single source of truth for autocomplete.
 * Defined in `chat.commands.ts` and imported directly by CEF.
 */
export interface ChatCommand {
  /** The slash command trigger, e.g. '/me'. */
  command: string;
  /** Usage hint shown in autocomplete, e.g. '/me [action]'. */
  usage: string;
  /** Short human-readable description. */
  hint: string;
  /** Tab this command is associated with. */
  tab: ChatTab;
  /** If true, only shown to admin users (adminLevel ≥ 2). */
  adminOnly?: boolean;
}
