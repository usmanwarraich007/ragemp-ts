/**
 * Logger — structured, colour-coded server logging.
 *
 * Usage:
 *   log.info('[tpm]', `${player.name} teleported`);
 *   log.warn('[auth]', 'bad token');
 *   log.error('[db]', 'query failed', err);
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

const RESET  = '\x1b[0m';
const COLORS: Record<LogLevel, string> = {
  INFO:  '\x1b[36m', // cyan
  WARN:  '\x1b[33m', // yellow
  ERROR: '\x1b[31m', // red
  DEBUG: '\x1b[35m', // magenta
};

function write(level: LogLevel, tag: string, message: string, extra?: unknown): void {
  const color     = COLORS[level];
  const timestamp = new Date().toTimeString().slice(0, 8);
  const prefix    = `${color}[${timestamp}] [${level}] ${tag}${RESET}`;

  if (extra !== undefined) {
    console.log(`${prefix} ${message}`, extra);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export const log = {
  info (tag: string, message: string, extra?: unknown): void { write('INFO',  tag, message, extra); },
  warn (tag: string, message: string, extra?: unknown): void { write('WARN',  tag, message, extra); },
  error(tag: string, message: string, extra?: unknown): void { write('ERROR', tag, message, extra); },
  debug(tag: string, message: string, extra?: unknown): void { write('DEBUG', tag, message, extra); },
};
