/**
 * session/index.ts — Client-side session state.
 *
 * Stores data set by the server after a player authenticates and selects a character.
 * Import from this module anywhere on the client — never import session.ts directly.
 *
 * To add new session fields:
 *   1. Add the field variable below.
 *   2. Register a mp.events.add listener to set it.
 *   3. Export a typed getter function.
 */

import { getCharacterId, onCharacterChange } from './character';

export { getCharacterId, onCharacterChange };
