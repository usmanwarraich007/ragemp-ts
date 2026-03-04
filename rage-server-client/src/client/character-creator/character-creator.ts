/**
 * character-creator.ts — Orchestrator
 *
 * Wires CEF events to the reusable camera module and applyAppearance.
 * Camera logic now lives in src/client/camera/ and can be reused by any feature.
 */
import type { CharacterAppearance } from '@ragemp/shared';
import { SELECT_HEADING } from '../character-select/location';
import {
  charCreatorCamera,
  disableOrbit,
  setDragging,
  adjustRadius,
  setLookBone,
  zoneForTab,
  rotatePolar,
  setPanelHovered,
} from '../camera';
import { applyAppearance, resetAppearance } from './ped';

// ── CEF → Ped live preview ────────────────────────────────────────────────────

mp.events.add('cmd:previewAppearance', (appearanceJson: string) => {
  const a: CharacterAppearance = JSON.parse(appearanceJson);
  applyAppearance(mp.players.local, a);
});

// Apply saved appearance after character select (sent by server after spawn)
mp.events.add('character:applyAppearance', (appearanceJson: string) => {
  const a: CharacterAppearance = JSON.parse(appearanceJson);
  applyAppearance(mp.players.local, a);
});

// ── CEF → Camera: drag start/stop (only 2 events per drag gesture) ───────────
// Mouse delta is read by the render loop using getDisabledControlNormal — no
// per-frame triggers needed from CEF.

mp.events.add('character:startDrag', () => {
  setDragging(true);
});

mp.events.add('character:stopDrag', () => {
  setDragging(false);
});

// ── CEF → Camera: scroll zoom fallback ───────────────────────────────────────
// The render loop also reads scroll controls natively, but CEF wheel events
// work too — whichever fires first wins.

mp.events.add('character:cameraZoom', (json: string) => {
  adjustRadius(JSON.parse(json) as number);
});

// ── CEF → Camera: panel hover — suppress native scroll zoom ──────────────────
mp.events.add('character:panelHovered', (val: string) => {
  setPanelHovered(val === 'true');
});

// ── CEF → Ped: arrow key character rotation ───────────────────────────────────────
// dir = -1 (left) or 1 (right); each press = 15°
// Camera stays put — character rotates under it, revealing different angles.

mp.events.add('character:rotateCharacter', (json: string) => {
  const rawDir = JSON.parse(json);
  const dir    = typeof rawDir === 'number' ? rawDir : (rawDir > 0 ? 1 : -1);
  const degrees = dir * 15;

  const local = mp.players.local;
  const newHeading = (local.heading + degrees + 360) % 360;

  // Use native setHeading — more reliable than the .heading property setter
  mp.game.entity.setHeading(local.handle, newHeading);
});

// ── CEF → Camera: tab change → focus camera on correct body zone ──────────────

mp.events.add('character:setCameraZone', (json: string) => {
  const tab = JSON.parse(json) as string;
  const bone = zoneForTab(tab);
  setLookBone(mp.players.local, bone);
});

// ── Lifecycle (called by client/index.ts) ─────────────────────────────────────

export function onCreatorOpen(): void {
  const local = mp.players.local;

  // Reset ALL appearance (clothes, overlays, props, tattoos) — not just components.
  // setDefaultComponentVariation() alone leaves beard, glasses etc. from the
  // previously selected character's clothing preview.
  resetAppearance(local);

  // Must unfreeze before changing heading — GTA ignores heading setter on
  // a frozen entity. This happens when coming from the char-select screen.
  local.freezePosition(false);
  mp.game.entity.setHeading(local.handle, SELECT_HEADING); // same as char-select
  local.freezePosition(true);

  charCreatorCamera(local);
}

export function onCreatorClose(): void {
  // Stop the orbit render loop only — do NOT destroy the scripted camera.
  // join-state.ts will activate the char-select cam (scripted→scripted),
  // then silently destroy this one. If we destroy here first, scriptActive
  // goes false and causes a gameplay camera flash.
  disableOrbit();
  mp.players.local.freezePosition(false);
}
