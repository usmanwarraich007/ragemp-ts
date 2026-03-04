/**
 * session/character.ts — Active character session state.
 *
 * Set by the server via 'character:setId' event after a character is selected.
 */

let _characterId: number | null = null;
const _listeners: Array<(id: number | null) => void> = [];

mp.events.add('character:setId', (id: number) => {
  _characterId = id;
  _listeners.forEach((fn) => fn(id));
});

/** Returns the active character's database ID, or null if not yet selected. */
export function getCharacterId(): number | null {
  return _characterId;
}

/**
 * Register a callback that fires whenever the character changes.
 * Useful for systems that need to react to character selection (e.g. reloading business data).
 */
export function onCharacterChange(fn: (id: number | null) => void): void {
  _listeners.push(fn);
}
