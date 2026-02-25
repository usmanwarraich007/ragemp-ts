import type { InjectionKey } from 'vue';
import type { CharacterAppearance } from '@ragemp/shared';

/** Reactive CharacterAppearance object owned by CharacterCreator.vue */
export const APP_KEY = Symbol('cc-app') as InjectionKey<CharacterAppearance>;

/** Triggers a live preview update in the game client */
export const PREVIEW_KEY = Symbol('cc-preview') as InjectionKey<() => void>;

/**
 * Toggles a head overlay slot on/off.
 * Provided by CharacterCreator.vue because it needs access to the overlay definitions.
 */
export const TOGGLE_OVERLAY_KEY = Symbol('cc-toggle-overlay') as InjectionKey<
  (slot: number, on: boolean) => void
>;
