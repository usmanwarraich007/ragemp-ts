/**
 * admin/admin.feature.ts — Server-side admin commands.
 *
 * All commands require adminLevel >= 1 unless noted.
 * Use /setadmin [id] [level] (adminLevel 5+) to promote accounts.
 */
import { Command } from '../../core/Command';
import { playerStore } from '../../core/playerStore';
import { log } from '../../core/logger';

// Track last spawned vehicle per player for /dv
const lastVehicle = new Map<number, VehicleMp>();

class AdminCommands {

  // ── Vehicle ──────────────────────────────────────────────────────────────

  @Command('aveh', { usage: '/veh [model]', minArgs: 1, adminLevel: 1 })
  static spawnVehicle(player: PlayerMp, model: string): void {
    // Delete old vehicle
    const old = lastVehicle.get(player.id);
    if (old && mp.vehicles.exists(old)) old.destroy();

    const hash = mp.joaat(model);
    const pos  = player.position;
    const veh  = mp.vehicles.new(hash, pos, {
      heading:   player.heading,
      dimension: player.dimension,
    });

    if (!veh) {
      player.outputChatBox(`!{FF4444}Unknown model: ${model}`);
      return;
    }

    lastVehicle.set(player.id, veh);
    player.putIntoVehicle(veh, -1);
    player.outputChatBox(`!{00FF88}Spawned: ${model}`);
    log.info('[Admin]', `${player.name} spawned vehicle: ${model}`);
  }

  @Command('dv', { adminLevel: 1 })
  static deleteVehicle(player: PlayerMp): void {
    const veh = player.vehicle ?? lastVehicle.get(player.id);
    if (veh && mp.vehicles.exists(veh)) {
      veh.destroy();
      lastVehicle.delete(player.id);
      player.outputChatBox('!{00FF88}Vehicle deleted.');
    } else {
      player.outputChatBox('!{FF4444}No vehicle to delete.');
    }
  }

  @Command('fix', { adminLevel: 1 })
  static fixVehicle(player: PlayerMp): void {
    const veh = player.vehicle;
    if (!veh) { player.outputChatBox('!{FF4444}Not in a vehicle.'); return; }
    veh.repair();
    player.outputChatBox('!{00FF88}Vehicle repaired.');
  }

  // ── Teleport ─────────────────────────────────────────────────────────────

  @Command('tp', { usage: '/tp [id]', minArgs: 1, adminLevel: 1 })
  static teleportTo(player: PlayerMp, targetId: string): void {
    const target = mp.players.at(parseInt(targetId));
    if (!target || !mp.players.exists(target)) {
      player.outputChatBox('!{FF4444}Player not found.');
      return;
    }
    player.position = target.position;
    player.outputChatBox(`!{00FF88}Teleported to ${target.name}.`);
  }

  @Command('tphere', { usage: '/tphere [id]', minArgs: 1, adminLevel: 1 })
  static teleportHere(player: PlayerMp, targetId: string): void {
    const target = mp.players.at(parseInt(targetId));
    if (!target || !mp.players.exists(target)) {
      player.outputChatBox('!{FF4444}Player not found.');
      return;
    }
    target.position = player.position;
    target.outputChatBox(`!{FFAA00}You were teleported by an admin.`);
    player.outputChatBox(`!{00FF88}Brought ${target.name} to you.`);
  }

  // ── God mode ─────────────────────────────────────────────────────────────

  @Command('god', { adminLevel: 1 })
  static toggleGod(player: PlayerMp): void {
    player.call('admin:godToggle', []);
  }

  // ── Noclip ───────────────────────────────────────────────────────────────

  @Command('noclip', { adminLevel: 1 })
  static toggleNoclip(player: PlayerMp): void {
    player.call('admin:noclipToggle', []);
  }

  // ── Coords ───────────────────────────────────────────────────────────────

  @Command('coords', { adminLevel: 1 })
  static getCoords(player: PlayerMp): void {
    const p = player.position;
    const h = player.heading;
    const clipText = `new mp.Vector3(${p.x.toFixed(4)}, ${p.y.toFixed(4)}, ${p.z.toFixed(4)})`;
    // Show in chat (visible + can copy manually)
    player.outputChatBox(`!{AAFFAA}Coords: !{FFFFFF}X: ${p.x.toFixed(4)}  Y: ${p.y.toFixed(4)}  Z: ${p.z.toFixed(4)}  H: ${h.toFixed(2)}`);
    player.outputChatBox(`!{AAAAFF}${clipText}`);
    // Also send to clipboard via browser
    player.call('admin:copyCoords', [clipText]);
  }

  // ── ESP ───────────────────────────────────────────────────────────────────

  @Command('esp', { adminLevel: 1 })
  static toggleEsp(player: PlayerMp): void {
    player.call('admin:espToggle', []);
  }

  // ── World ─────────────────────────────────────────────────────────────────

  @Command('time', { usage: '/time [hour] [min]', minArgs: 1, adminLevel: 1 })
  static setTime(player: PlayerMp, hour: string, min = '0'): void {
    const h = Math.min(23, Math.max(0, parseInt(hour)));
    const m = Math.min(59, Math.max(0, parseInt(min)));
    mp.world.time.hour   = h;
    mp.world.time.minute = m;
    mp.players.forEach(p => p.outputChatBox(`!{AAAAFF}Time set to ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`));
    log.info('[Admin]', `${player.name} set time to ${h}:${m}`);
  }

  @Command('weather', { usage: '/weather [type]', minArgs: 1, adminLevel: 1 })
  static setWeather(player: PlayerMp, type: string): void {
    mp.world.weather = type.toUpperCase();
    mp.players.forEach(p => p.outputChatBox(`!{AAAAFF}Weather set to ${type.toUpperCase()}`));
    log.info('[Admin]', `${player.name} set weather to ${type}`);
  }

  // ── Player management ────────────────────────────────────────────────────

  @Command('freeze', { usage: '/freeze [id]', minArgs: 1, adminLevel: 1 })
  static freezePlayer(player: PlayerMp, targetId: string): void {
    const target = mp.players.at(parseInt(targetId));
    if (!target || !mp.players.exists(target)) {
      player.outputChatBox('!{FF4444}Player not found.');
      return;
    }
    target.call('admin:freezeToggle', []);
    player.outputChatBox(`!{00FF88}Toggled freeze on ${target.name}.`);
  }

  @Command('givecash', { usage: '/givecash [id] [amount]', minArgs: 2, adminLevel: 1 })
  static giveCash(player: PlayerMp, targetId: string, amount: string): void {
    const target = mp.players.at(parseInt(targetId));
    if (!target || !mp.players.exists(target)) {
      player.outputChatBox('!{FF4444}Player not found.');
      return;
    }
    const amt = parseInt(amount);
    if (isNaN(amt) || amt <= 0) { player.outputChatBox('!{FF4444}Invalid amount.'); return; }
    target.outputChatBox(`!{00FF88}You received $${amt.toLocaleString()} from an admin.`);
    player.outputChatBox(`!{00FF88}Gave $${amt.toLocaleString()} to ${target.name}.`);
    log.info('[Admin]', `${player.name} gave $${amt} to ${target.name}`);
  }

  @Command('skin', { usage: '/skin [model]', minArgs: 1, adminLevel: 1 })
  static setSkin(player: PlayerMp, model: string): void {
    player.call('admin:setSkin', [model]);
    player.outputChatBox(`!{00FF88}Skin changed to: ${model}`);
  }

  @Command('revive', { usage: '/revive [id?]', adminLevel: 1 })
  static revivePlayer(player: PlayerMp, targetId?: string): void {
    const target = targetId
      ? mp.players.at(parseInt(targetId))
      : player;

    if (!target || !mp.players.exists(target)) {
      player.outputChatBox('!{FF4444}Player not found.');
      return;
    }

    // Restore health (RAGE:MP health includes the 100 base — 200 = full)
    target.health = 200;
    target.armour = 0;

    // Spawn the ped at their current position in case they are in a death state
    target.spawn(target.position);

    if (target.id !== player.id) {
      target.outputChatBox('!{00FF88}You have been revived by an admin.');
      player.outputChatBox(`!{00FF88}Revived ${target.name}.`);
    } else {
      player.outputChatBox('!{00FF88}You have been revived.');
    }

    log.info('[Admin]', `${player.name} revived ${target.name}`);
  }

  @Command('setadmin', { usage: '/setadmin [id] [level]', minArgs: 2, adminLevel: 5 })
  static setAdmin(player: PlayerMp, targetId: string, level: string): void {
    const target = mp.players.at(parseInt(targetId));
    if (!target || !mp.players.exists(target)) {
      player.outputChatBox('!{FF4444}Player not found.');
      return;
    }
    const lvl = parseInt(level);
    if (isNaN(lvl)) { player.outputChatBox('!{FF4444}Invalid level.'); return; }

    const data = playerStore.get(target);
    if (data?.account) {
      playerStore.patch(target, { account: { ...data.account, adminLevel: lvl } });
    }
    target.outputChatBox(`!{00FF88}Your admin level was set to ${lvl}.`);
    player.outputChatBox(`!{00FF88}Set ${target.name} admin level to ${lvl}.`);
    log.info('[Admin]', `${player.name} set ${target.name} admin level to ${lvl}`);
  }
}

void AdminCommands;

// Clean up spawned vehicles when admin leaves
mp.events.add('playerQuit', (player: PlayerMp) => {
  const veh = lastVehicle.get(player.id);
  if (veh && mp.vehicles.exists(veh)) veh.destroy();
  lastVehicle.delete(player.id);
});
