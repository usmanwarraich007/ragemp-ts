import './hello-world/hello-world';
import './hud/vehicle-hud';
import './hud/notification-relay';
import './rpc/RpcBridge';
import { browserManager } from './browser';
import { clientRpc } from './rpc/clientRpc';


// CEF URL:
// - In-game (production build): 'package://cef/index.html'
// - Local dev (Vite):           'http://localhost:5173'
const CEF_URL = 'http://localhost:5173';

mp.events.add('playerReady', () => {
  browserManager.create(CEF_URL);
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
