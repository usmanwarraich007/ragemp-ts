/**
 * Module auto-loader.
 * Eagerly imports each module's index.ts (one level deep only).
 * Each index.ts calls createModule() to register its component.
 * Adding a new module = new folder with an index.ts. No other wiring needed.
 */
import.meta.glob('./*/index.ts', { eager: true });


