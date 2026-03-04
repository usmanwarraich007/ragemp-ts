/**
 * character-select.ts — Live appearance preview on the character-select screen.
 *
 * When the CEF character-select screen highlights a character, it triggers
 * 'character:previewSelected' with the character's saved CharacterAppearance JSON.
 * We apply it to mp.players.local so the player can see their saved outfit before spawning.
 */
import type { CharacterAppearance } from '@ragemp/shared';
import { applyAppearance } from '../character-creator/ped';

mp.events.add('character:previewSelected', (appearanceJson: string) => {
  try {
    const appearance: CharacterAppearance = JSON.parse(appearanceJson);
    applyAppearance(mp.players.local, appearance);
  } catch (e) {
    mp.console.logWarning('[CharacterSelect] Failed to parse appearance: ' + String(e));
  }
});
