import './interaction/InteractionMenu'; // menu draw engine — must load before registry
import './interaction/MarkerSystem';    // standalone world marker renderer
import './vehicles/vehicle-bone-hud';   // all vehicle bone interactables (doors, hood, trunk)
import './vehicles/vehicle-stream';     // applies saved visuals (colors, mods, neon) on stream-in
import './vehicles/vehicle-controls.client'; // engine (↑/↓) + lock (K) key bindings
import './session';                      // stores characterId sent by server on character:select
import './business';                     // business system — registers handlers for all types
import './garage';                       // garage system — registers handlers for all garage types
import './chat/chat.client';             // chat relay — T key, message + focus forwarding to CEF
import './hud/vehicle-hud';
import './hud/notification-relay';
import './hud/hud-cleanup';
import './rpc/RpcBridge';
import './character-creator/character-creator'; // registers preview + rotate events
import './character-select/character-select';   // registers appearance preview for char-select screen
import './character-select/join-state';          // manages hide/freeze/camera across join → auth → spawn
import './admin'; // admin dev utilities
import { browserManager } from './browser';
import { onCreatorOpen, onCreatorClose } from './character-creator/character-creator';


const IS_DEV = false;
const CEF_URL = IS_DEV
  ? 'http://localhost:5173'
  : 'package://cef/index.html';

mp.events.add('playerReady', () => {
  browserManager.create(CEF_URL);
});

// Once the CEF DOM is loaded, tell the server — it will show the appropriate page.
mp.events.add('browserDomReady', () => {
  mp.events.callRemote('client:browserReady');
});

// ── Page transitions ──────────────────────────────────────────────────────────

mp.events.add('cmd:showPage', (page: string) => {
  browserManager.show(page);
  if (page === 'character-creator') onCreatorOpen();
  else onCreatorClose(); // no-op if creator was not active
});

mp.events.add('cmd:hidePage', () => {
  browserManager.hide();
  onCreatorClose();
});

