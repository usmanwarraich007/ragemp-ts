/**
 * session.ts — Stores client-side session state set by the server after character:select.
 *
 * Use getCharacterId() anywhere on the client to get the active character's DB id.
 */

let _characterId: number | null = null;

mp.events.add('character:setId', (id: number) => {
  _characterId = id;
});

export function getCharacterId(): number | null {
  return _characterId;
}
