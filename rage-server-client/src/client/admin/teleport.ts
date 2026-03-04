/**
 * admin/teleport.ts — Client-side handler for admin teleport-to-waypoint.
 * Reads the GPS blip coords and forwards them to the server RPC.
 */
import { clientRpc } from '../rpc/clientRpc';

mp.events.add('cmd:tpm', async () => {
  const blip = mp.game.ui.getFirstBlipInfoId(8);
  const x = mp.game.ui.doesBlipExist(blip) ? mp.game.ui.getBlipCoords(blip).x : 0;
  const y = mp.game.ui.doesBlipExist(blip) ? mp.game.ui.getBlipCoords(blip).y : 0;
  const z = mp.game.ui.doesBlipExist(blip) ? mp.game.ui.getBlipCoords(blip).z : 0;
  await clientRpc.callServer('tpm:teleport', x, y, z);
});
