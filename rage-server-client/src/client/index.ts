import './hello-world/hello-world';
import './hud/vehicle-hud';
import { browserManager } from './browser';

// CEF URL:
// - In-game (production build): 'package://cef/index.html'
// - Local dev (Vite):           'http://localhost:5173'
const CEF_URL = 'package://cef/index.html';

mp.events.add('playerReady', () => {
  browserManager.create(CEF_URL);
});

/**
 * /tpm — Client side: read the waypoint blip position and send it to the server.
 * The waypoint blip always has sprite 8 in GTA V.
 * If no waypoint is set, GET_FIRST_BLIP_INFO_ID returns an invalid blip (handle 0).
 */
mp.events.add('client:getWaypointPosition', () => {
  // Waypoint blip sprite is 8
  const waypointSprite = 8;
  const blip = mp.game.ui.getFirstBlipInfoId(waypointSprite);

  if (!mp.game.ui.doesBlipExist(blip)) {
    // No waypoint set — report (0,0) so the server knows
    mp.events.callRemote('server:teleportToWaypoint', 0, 0, 0);
    return;
  }

  const coords = mp.game.ui.getBlipCoords(blip);

  // GTA V waypoints don't carry a Z value from the map; we pass 0 and
  // the server adds +1.5. A proper Z can be found via GET_GROUND_Z_FOR_3D_COORD
  // but that requires the chunk to be loaded on the client, so we keep it simple.
  mp.events.callRemote('server:teleportToWaypoint', coords.x, coords.y, coords.z);
});
