/**
 * location.ts — Shared position and heading for the character-select scene.
 *
 * Both the character-select screen and the character-creator use the same
 * location (same wardrobe), so heading must match exactly.
 * Change these values in one place to move/rotate the whole scene.
 */

export const SELECT_POS     = new mp.Vector3(-811.6949, 175.1525, 76.7453);
export const SELECT_HEADING = 117.96; // degrees; player faces the wardrobe mirror
