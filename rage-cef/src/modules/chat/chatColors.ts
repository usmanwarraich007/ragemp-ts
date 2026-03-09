/**
 * chatColors.ts — Named color map and tag parser for chat messages.
 *
 * Supports two syntaxes in message text:
 *   {colorName}  → looked up in CHAT_COLOR_MAP  (e.g. {blue}, {gold})
 *   {RRGGBB}     → treated as a raw hex code     (e.g. {FF4444}, {2ecc71})
 *
 * Unknown tags are rendered without a color override.
 *
 * Example:
 *   "{blue}Selling {white}a house in {2ecc71}Vinewood"
 *   → [{ text: 'Selling ', color: '#0099ff' }, { text: 'a house in ', color: '#ffffff' }, ...]
 */

export const CHAT_COLOR_MAP: Record<string, string> = {
  white:  '#ffffff',
  red:    '#ff4444',
  green:  '#2ecc71',
  blue:   '#0099ff',
  yellow: '#f1ef5d',
  orange: '#e67e22',
  purple: '#c8a2c8',
  gray:   '#888888',
  grey:   '#888888',
  cyan:   '#00ffff',
  pink:   '#ff69b4',
  gold:   '#ffd700',
  lime:   '#00ff9f',
  black:  '#111111',
};

/** Hex color shorthand regex — exactly 6 hex chars */
const HEX_RE = /^[0-9A-Fa-f]{6}$/;

export interface ColorSegment {
  text:  string;
  /** CSS-compatible color string (with leading #), or empty to inherit. */
  color: string;
}

/**
 * Split `text` on `{tag}` markers and resolve each tag to a hex color.
 * The first segment (before any tag) inherits the caller's default color.
 */
export function parseColorTags(text: string, defaultColor = ''): ColorSegment[] {
  // Split on {…} groups — keep the delimiters so we can process them.
  const parts  = text.split(/\{([^}]+)\}/);
  const result: ColorSegment[] = [];
  let currentColor = defaultColor;

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // Even indices are plain text segments
      if (parts[i]) {
        result.push({ text: parts[i], color: currentColor });
      }
    } else {
      // Odd indices are tag names — resolve to color, then continue
      const tag = parts[i].trim();
      if (HEX_RE.test(tag)) {
        currentColor = `#${tag}`;
      } else {
        currentColor = CHAT_COLOR_MAP[tag.toLowerCase()] ?? currentColor;
      }
    }
  }

  return result.length ? result : [{ text, color: defaultColor }];
}
