/**
 * Server-side commands.
 *
 * Usage in-game: /veh [model]  e.g. /veh adder
 */

mp.events.addCommand('veh', (player: PlayerMp, fullText: string, model: string) => {
  if (!model) {
    player.outputChatBox('!{FF4444}Usage: /veh [model name]  e.g. /veh adder');
    return;
  }

  const hash = mp.joaat(model.toLowerCase());

  // Spawn the vehicle 3 units in front of the player
  const forward = {
    x: player.position.x + Math.sin(-player.heading * (Math.PI / 180)) * 5,
    y: player.position.y + Math.cos(-player.heading * (Math.PI / 180)) * 5,
    z: player.position.z,
  };

  const vehicle = mp.vehicles.new(hash, new mp.Vector3(forward.x, forward.y, forward.z), {
    heading: player.heading,
    numberPlate: 'ADMIN',
    dimension: player.dimension,
  });

  if (!vehicle) {
    player.outputChatBox(`!{FF4444}Failed to spawn vehicle. Check model name: ${model}`);
    return;
  }

  player.outputChatBox(`!{44FF88}Spawned: ${model}`);
  console.log(`[CMD] /veh ${model} → spawned for ${player.name}`);
});

/**
 * /tpm — Teleport to the waypoint marker the player has placed on the map.
 * Flow:
 *   1. Server asks the client to read the waypoint via native.
 *   2. Client replies with { x, y, z } or null (no marker set).
 *   3. Server teleports the player.
 */
mp.events.addCommand('tpm', (player: PlayerMp) => {
  // Ask the client to fetch its waypoint position
  player.call('client:getWaypointPosition');
});

// The client replies here once it has read the blip position
mp.events.add('server:teleportToWaypoint', (player: PlayerMp, x: number, y: number, z: number) => {
  if (x === 0 && y === 0) {
    player.outputChatBox('!{FF4444}No waypoint set. Place a marker on the map first.');
    return;
  }

  player.position = new mp.Vector3(x, y, z + 1.5); // +1.5 so player lands on surface
  player.outputChatBox('!{44FF88}Teleported to waypoint.');
  console.log(`[CMD] /tpm → teleported ${player.name} to (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`);
});
