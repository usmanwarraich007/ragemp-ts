/**
 * join-state.ts — Manages player state across three phases.
 *
 *   Phase 1 — JOIN (before auth):
 *     • Pins player at sky position via render loop.
 *     • Creates a sky-hold scripted camera immediately → scriptActive=true from start.
 *     • Makes ped invisible + invincible. Mutes ambients.
 *
 *   Phase 2 — CHARACTER SELECT (after login):
 *     • Teleports to select position, freezes.
 *     • Activates char-select scripted cam (scripted→scripted, no flash).
 *     • Silently destroys old sky-hold or creator cameras.
 *
 *   Phase 3 — SPAWNED:
 *     • Stops render loop, unfreezes, restores audio.
 *     • Destroys char-select cam → ONLY place that returns to gameplay camera.
 */

import {
  charSelectCamera,
  stopCharSelectCamera,
  activateSkyHoldCamera,
  destroySkyHoldCamera,
  cameraManager,
} from '../camera';
import { SELECT_POS, SELECT_HEADING } from './location';

// ── Pinned position state ─────────────────────────────────────────────────────

let holdActive = false;
let holdX = 0, holdY = 0, holdZ = 0;

mp.events.add('render', () => {
  if (!holdActive) return;
  mp.players.local.setCoordsNoOffset(holdX, holdY, holdZ, false, false, false);
});

// ── Constants ─────────────────────────────────────────────────────────────────

const AUDIO_SCENE = 'CHARACTER_CHANGE_IN_SKY_SCENE';

// ── Phase 1: Server calls this on playerJoin ──────────────────────────────────

mp.events.add('cmd:holdInSky', (x: number, y: number, z: number) => {
  const player = mp.players.local;

  holdX = x; holdY = y; holdZ = z;
  holdActive = true;
  player.setCoordsNoOffset(x, y, z, false, false, false);

  player.freezePosition(true);
  player.setInvincible(true);
  player.setVisible(false, false);

  // Activate a scripted camera immediately so scriptActive=true from join.
  // Every subsequent cam switch (char-select, creator) will be scripted→scripted
  // — no gameplay camera flash occurs during the entire pre-spawn flow.
  activateSkyHoldCamera(x, y, z);

  mp.game.audio.startAudioScene(AUDIO_SCENE);
});

// ── Phase 2: Auth succeeded — character select ────────────────────────────────

mp.events.add('cmd:showPage', (page: string) => {
  if (page !== 'character-select') return;

  const player = mp.players.local;

  holdActive = false;

  player.setCoordsNoOffset(SELECT_POS.x, SELECT_POS.y, SELECT_POS.z, false, false, false);
  player.setVisible(true, false);
  mp.game.entity.setHeading(player.handle, SELECT_HEADING);
  player.freezePosition(true);

  // Wait for skeleton to initialize, then switch cameras scripted→scripted.
  // destroySkyHoldCamera / destroySilent('character-creator') clean up the
  // previous camera WITHOUT calling renderScriptCams(false) — no flash.
  setTimeout(() => {
    charSelectCamera(mp.players.local, SELECT_HEADING);
    destroySkyHoldCamera();
    cameraManager.destroySilent('character-creator');
  }, 150);
});

// ── Phase 3: Spawned — the ONLY place that returns to gameplay camera ─────────

mp.events.add('cmd:hidePage', () => {
  holdActive = false;

  const player = mp.players.local;
  player.freezePosition(false);
  player.setInvincible(false);

  mp.game.audio.stopAudioScene(AUDIO_SCENE);

  // This is the sole call to deactivate() → renderScriptCams(false).
  stopCharSelectCamera();
});
