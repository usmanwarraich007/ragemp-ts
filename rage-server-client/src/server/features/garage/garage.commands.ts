/**
 * garage.commands.ts — Admin commands for managing garages.
 *
 * /garage create [type] [fee] [name]  — create at player position
 * /garage delete [id]                  — remove + broadcast
 * /garage list                         — print all to chat
 * /garage setzone [id] [zoneKey]       — set zone to player position
 * /garage setfee [id] [amount]         — change park fee
 * /garage tp [id]                      — teleport admin to garage anchor
 */

import { Command, log, playerStore } from '../../core';
import * as svc from './garage.service';
import { broadcastRemove, broadcastUpdate } from './garage.feature';
import { vehicleManager } from '../vehicles/vehicle-manager.server';
import type { GarageType } from '@ragemp/shared';

const VALID_TYPES: GarageType[] = ['PUBLIC', 'APARTMENT', 'HOUSE'];

class GarageCommands {
  @Command('garage', { adminLevel: 1 })
  static async garage(player: PlayerMp, sub: string, ...args: string[]): Promise<void> {

    switch (sub?.toLowerCase()) {

      case 'create': {
        const [typeRaw, feeRaw, ...nameParts] = args;
        const type = typeRaw?.toUpperCase() as GarageType;
        const fee  = parseFloat(feeRaw);
        const name = nameParts.join(' ');

        if (!VALID_TYPES.includes(type) || isNaN(fee) || !name) {
          player.outputChatBox(`!{FFAA00}Usage: /garage create [${VALID_TYPES.join('|')}] [fee] [name]`);
          return;
        }

        const pos = player.position;

        // Default zones per garage type
        const defaultZones = type === 'PUBLIC' ? [
          { key: 'entrance', dx: 0, dy: 0 },
          { key: 'spawn',    dx: 5, dy: 0 },
        ] : [];

        const g     = await svc.createGarage(type, name, fee, pos.x, pos.y, pos.z, defaultZones);
        const zones = await svc.getZones(g.id);
        const dto   = JSON.stringify(svc.toDto(g, zones));
        mp.players.forEach((p) => p.call('garage:add', [dto]));

        player.outputChatBox(`!{44FF88}Garage #${g.id} "${g.name}" (${g.type}) created. Fee: $${fee}.`);
        break;
      }

      case 'delete': {
        const id = parseInt(args[0]);
        if (isNaN(id)) { player.outputChatBox('!{FFAA00}Usage: /garage delete [id]'); return; }

        const g = await svc.findById(id);
        if (!g) { player.outputChatBox(`!{FF4444}Garage #${id} not found.`); return; }

        await svc.deleteGarage(id);
        broadcastRemove(id);
        player.outputChatBox(`!{44FF88}Garage #${id} deleted.`);
        break;
      }

      case 'list': {
        const all = await svc.getAllGarages();
        if (all.length === 0) { player.outputChatBox('!{FFAA00}No garages exist.'); return; }
        player.outputChatBox('!{AAAAAA}--- Garages ---');
        for (const { garage: g } of all) {
          player.outputChatBox(
            `!{FFFFFF}#${g.id} [${g.type}] "${g.name}" — fee: $${Number(g.parkFee)}`,
          );
        }
        break;
      }

      case 'setzone': {
        const id      = parseInt(args[0]);
        const zoneKey = args[1]?.toLowerCase();
        if (isNaN(id) || !zoneKey) {
          player.outputChatBox('!{FFAA00}Usage: /garage setzone [id] [zoneKey]');
          return;
        }

        const g = await svc.findById(id);
        if (!g) { player.outputChatBox(`!{FF4444}Garage #${id} not found.`); return; }

        // When inside a vehicle, use the vehicle's position + heading
        // (player.position gives the driver-seat offset, not the vehicle's centre)
        const veh     = player.vehicle;
        const pos     = veh ? veh.position : player.position;
        const heading = veh ? veh.heading  : player.heading;
        await svc.upsertZone(id, zoneKey, pos.x, pos.y, pos.z, heading);

        const zones  = await svc.getZones(id);
        const dtoStr = JSON.stringify(svc.toDto(g, zones));
        mp.players.forEach((p) => p.call('garage:update', [dtoStr]));

        player.outputChatBox(`!{44FF88}Zone "${zoneKey}" for garage #${id} set to your position.`);
        break;
      }

      case 'setfee': {
        const id     = parseInt(args[0]);
        const amount = parseFloat(args[1]);
        if (isNaN(id) || isNaN(amount)) {
          player.outputChatBox('!{FFAA00}Usage: /garage setfee [id] [amount]');
          return;
        }

        const g = await svc.findById(id);
        if (!g) { player.outputChatBox(`!{FF4444}Garage #${id} not found.`); return; }

        await svc.updateGarage(g, { parkFee: amount });
        broadcastUpdate(g);
        player.outputChatBox(`!{44FF88}Garage #${id} park fee updated to $${amount}.`);
        break;
      }

      case 'tp': {
        const id = parseInt(args[0]);
        if (isNaN(id)) { player.outputChatBox('!{FFAA00}Usage: /garage tp [id]'); return; }

        const g = await svc.findById(id);
        if (!g) { player.outputChatBox(`!{FF4444}Garage #${id} not found.`); return; }

        player.position = new mp.Vector3(g.x, g.y, g.z + 0.5);
        player.outputChatBox(`!{44FF88}Teleported to garage #${id}.`);
        break;
      }

      default:
        player.outputChatBox('!{FFAA00}Subcommands: create | delete | list | setzone | setfee | tp');
    }
  }
}

// ── Player command: /park ─────────────────────────────────────────────────────

const PARK_RADIUS = 10.0; // metres from entrance zone

class PlayerGarageCommands {
  @Command('park')
  static async park(player: PlayerMp): Promise<void> {
    if (!player.vehicle) {
      player.outputChatBox('!{FFAA00}You must be in a vehicle to park.');
      return;
    }

    const pos     = player.position;
    const garages = await svc.getAllGarages();

    // Find the closest garage whose entrance zone is within PARK_RADIUS
    let closestId   = -1;
    let closestDist = Infinity;

    for (const { garage: g, zones } of garages) {
      const entrance = zones.find((z) => z.zoneKey === 'entrance') ?? g;
      const dist = Math.sqrt(
        (pos.x - entrance.x) ** 2 +
        (pos.y - entrance.y) ** 2 +
        (pos.z - entrance.z) ** 2,
      );
      if (dist < PARK_RADIUS && dist < closestDist) {
        closestDist = dist;
        closestId   = g.id;
      }
    }

    if (closestId === -1) {
      player.outputChatBox('!{FF4444}No garage nearby. Drive to a garage entrance first.');
      return;
    }

    const charId = playerStore.get(player).character?.id ?? null;
    if (!charId) { player.outputChatBox('!{FF4444}Not logged in.'); return; }

    const garage = await svc.findById(closestId);
    if (!garage) { player.outputChatBox('!{FF4444}Garage not found.'); return; }

    const dbVehicle = vehicleManager.getRuntimeByMp(player.vehicle)?.dbRow ?? null;
    if (!dbVehicle) {
      player.outputChatBox('!{FF4444}This vehicle cannot be parked here.');
      return;
    }
    if (dbVehicle.characterId !== charId) {
      player.outputChatBox('!{FF4444}You do not own this vehicle.');
      return;
    }

    const fee = Number(garage.parkFee);
    await vehicleManager.storeToGarage(dbVehicle.id, closestId);

    player.outputChatBox(`!{44FF88}Vehicle parked at ${garage.name}. Fee: $${fee}.`);
    log.info('[Garage]', `${player.name} parked vehicle #${dbVehicle.id} in garage #${closestId}`);
  }
}

void GarageCommands;
void PlayerGarageCommands;
