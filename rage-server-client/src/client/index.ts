import './hello-world/hello-world';
import './hud/vehicle-hud';
import './hud/notification-relay';
import './rpc/RpcBridge';
import { browserManager } from './browser';
import { clientRpc } from './rpc/clientRpc';

// ── Page relay — server drives CEF page transitions ──────────────────────────
mp.events.add('cmd:showPage', (page: string) => {
  browserManager.show(page);
});

mp.events.add('cmd:hidePage', () => {
  browserManager.hide();
});

const CEF_URL = 'http://localhost:5173';

mp.events.add('playerReady', () => {
  browserManager.create(CEF_URL);
});

// Once the CEF DOM is loaded, tell the server — it will show the appropriate page.
mp.events.add('browserDomReady', () => {
  mp.events.callRemote('client:browserReady');
});

/**
 * /tpm — Client side: read the waypoint blip and call the server RPC handler.
 * The waypoint blip always has sprite 8 in GTA V.
 */
mp.events.add('cmd:tpm', async () => {
  const blip = mp.game.ui.getFirstBlipInfoId(8);

  const x = mp.game.ui.doesBlipExist(blip) ? mp.game.ui.getBlipCoords(blip).x : 0;
  const y = mp.game.ui.doesBlipExist(blip) ? mp.game.ui.getBlipCoords(blip).y : 0;
  const z = mp.game.ui.doesBlipExist(blip) ? mp.game.ui.getBlipCoords(blip).z : 0;

  await clientRpc.callServer('tpm:teleport', x, y, z);
});
