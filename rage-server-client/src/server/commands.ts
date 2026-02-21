import { Command, Rpc, notify } from './core';

// ── /testnotify — CEF notification smoke test (remove after verifying) ────
class DebugCommands {
  @Command('testnotify', { usage: '/testnotify [success|error|info|warning] [message]', minArgs: 1 })
  static test(player: PlayerMp, type: string, ...words: string[]): void {
    const msg = words.join(' ') || 'Test notification from server';
    const t = (['success', 'error', 'info', 'warning'].includes(type) ? type : 'info') as 'info';
    notify(player).screen[t](msg);
  }
}
void DebugCommands;

// ── /veh — Spawn a vehicle ────────────────────────────────────────────────

class VehicleCommands {
  @Command('veh', { usage: '/veh [model]', minArgs: 1 })
  static spawn(player: PlayerMp, model: string): void {
    const hash = mp.joaat(model.toLowerCase());

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
      notify(player).error(`Failed to spawn vehicle: ${model}`);
      return;
    }

    notify(player).success(`Spawned: ${model}`);
  }
}

// ── /tpm — Teleport to waypoint ───────────────────────────────────────────

class TeleportCommands {
  @Command('tpm')
  static toWaypoint(player: PlayerMp): void {
    player.call('cmd:tpm');
  }

  @Rpc('tpm:teleport')
  static teleport(player: PlayerMp, x: number, y: number, z: number): void {
    if (x === 0 && y === 0) {
      notify(player).error('No waypoint set. Place a marker on the map first.');
      return;
    }
    player.position = new mp.Vector3(x, y, z + 1.5);
    notify(player).success('Teleported to waypoint.');
  }
}

void VehicleCommands;
void TeleportCommands;
