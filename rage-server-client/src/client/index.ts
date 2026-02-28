import './interaction/InteractionMenu'; // menu draw engine — must load before registry
import './interaction/MarkerSystem';    // standalone world marker renderer
import './vehicles/vehicle-bone-hud';   // all vehicle bone interactables (doors, hood, trunk)
import './session';                      // stores characterId sent by server on character:select
import './business';                     // business system — registers handlers for all types
import './hello-world/hello-world';
import './hud/vehicle-hud';
import './hud/notification-relay';
import './hud/hud-cleanup';
import './rpc/RpcBridge';
import './character-creator/character-creator'; // registers preview + rotate events
import './admin'; // admin dev utilities
import { browserManager } from './browser';
import { clientRpc } from './rpc/clientRpc';
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

// ── Commands ──────────────────────────────────────────────────────────────────

mp.events.add('cmd:tpm', async () => {
  const blip = mp.game.ui.getFirstBlipInfoId(8);
  const x = mp.game.ui.doesBlipExist(blip) ? mp.game.ui.getBlipCoords(blip).x : 0;
  const y = mp.game.ui.doesBlipExist(blip) ? mp.game.ui.getBlipCoords(blip).y : 0;
  const z = mp.game.ui.doesBlipExist(blip) ? mp.game.ui.getBlipCoords(blip).z : 0;
  await clientRpc.callServer('tpm:teleport', x, y, z);
});
