/**
 * business.commands.ts — Admin commands for creating / managing businesses.
 *
 * /business create [type] [name]  — create at player position
 * /business delete [id]           — remove from DB + broadcast
 * /business list                  — print all to admin chat
 * /business setowner [id] [pid]   — force ownership transfer
 * /business tp [id]               — teleport admin to business anchor
 * /business toggle [id]           — open / close (admin override)
 */

import { Command } from '../../core';
import * as svc from './business.service';
import { broadcastRemove, broadcastUpdate } from './business.feature';
import type { BusinessType } from '@ragemp/shared';

const VALID_TYPES: BusinessType[] = ['DEALERSHIP', 'STORE_247', 'CLOTHING', 'PROPERTY'];

class BusinessCommands {
  @Command('business', { adminLevel: 1 })
  static async business(player: PlayerMp, sub: string, ...args: string[]): Promise<void> {

    switch (sub?.toLowerCase()) {

      case 'create': {
        const [typeRaw, ...nameParts] = args;
        const type = typeRaw?.toUpperCase() as BusinessType;
        const name = nameParts.join(' ');

        if (!VALID_TYPES.includes(type) || !name) {
          player.outputChatBox(`!{FFAA00}Usage: /business create [${VALID_TYPES.join('|')}] [name]`);
          return;
        }

        const pos = player.position;
        const defaultZones = type === 'DEALERSHIP' ? [
          { key: 'customer', dx: 0,  dy: 0 },
          { key: 'owner',    dx: 5,  dy: 0 },
          { key: 'showcase', dx: -3, dy: 4 },
        ] : type === 'STORE_247' ? [
          { key: 'customer', dx: 0, dy: 0 },
          { key: 'owner',    dx: 5, dy: 0 },
        ] : [];
        const b     = await svc.createBusiness(type, name, pos.x, pos.y, pos.z, defaultZones);
        const zones = await svc.getZones(b.id);
        const dto   = JSON.stringify(svc.toDto(b, zones));
        mp.players.forEach((p) => p.call('business:add', [dto]));
        player.outputChatBox(`!{44FF88}Business #${b.id} "${b.name}" (${b.type}) created at your position.`);
        break;
      }

      case 'delete': {
        const id = parseInt(args[0]);
        if (isNaN(id)) { player.outputChatBox('!{FFAA00}Usage: /business delete [id]'); return; }

        const b = await svc.findById(id);
        if (!b) { player.outputChatBox(`!{FF4444}Business #${id} not found.`); return; }

        await svc.deleteBusiness(id);
        broadcastRemove(id);
        player.outputChatBox(`!{44FF88}Business #${id} deleted.`);
        break;
      }

      case 'list': {
        const all = await svc.getAllBusinesses();
        if (all.length === 0) { player.outputChatBox('!{FFAA00}No businesses exist.'); return; }
        player.outputChatBox('!{AAAAAA}--- Businesses ---');
        for (const { business: b } of all) {
          player.outputChatBox(
            `!{FFFFFF}#${b.id} [${b.type}] "${b.name}" — ` +
            `owner: ${b.ownerId ?? 'none'} — ${b.isOpen ? '!{44FF88}OPEN' : '!{FF4444}CLOSED'}`,
          );
        }
        break;
      }

      case 'setowner': {
        const [idRaw, charIdRaw] = args;
        const id     = parseInt(idRaw);
        const charId = parseInt(charIdRaw);

        if (isNaN(id) || isNaN(charId)) {
          player.outputChatBox('!{FFAA00}Usage: /business setowner [id] [characterId]');
          return;
        }

        const b = await svc.findById(id);
        if (!b) { player.outputChatBox(`!{FF4444}Business #${id} not found.`); return; }

        await svc.transferOwnership(b, charId);
        broadcastUpdate(b);
        player.outputChatBox(`!{44FF88}Business #${id} transferred to character #${charId}.`);
        break;
      }

      case 'setpos': {
        const id = parseInt(args[0]);
        if (isNaN(id)) { player.outputChatBox('!{FFAA00}Usage: /business setpos [id]'); return; }

        const b = await svc.findById(id);
        if (!b) { player.outputChatBox(`!{FF4444}Business #${id} not found.`); return; }

        const pos = player.position;
        await svc.updatePosition(b, pos.x, pos.y, pos.z);
        broadcastUpdate(b);
        player.outputChatBox(`!{44FF88}Business #${id} anchor moved to your position.`);
        break;
      }

      case 'setzone': {
        const id      = parseInt(args[0]);
        const zoneKey = args[1]?.toLowerCase();
        if (isNaN(id) || !zoneKey) {
          player.outputChatBox('!{FFAA00}Usage: /business setzone [id] [customer|owner|showcase|...]');
          return;
        }

        const b = await svc.findById(id);
        if (!b) { player.outputChatBox(`!{FF4444}Business #${id} not found.`); return; }

        // Use vehicle heading when inside one (same as garage setzone)
        const veh     = player.vehicle;
        const pos     = veh ? veh.position : player.position;
        const heading = veh ? veh.heading  : player.heading;
        await svc.upsertZone(id, zoneKey, pos.x, pos.y, pos.z, heading);

        // Broadcast full update (includes new zone positions next sync)
        const zones  = await svc.getZones(id);
        const dto    = svc.toDto(b, zones);
        const dtoStr = JSON.stringify(dto);
        mp.players.forEach((p) => p.call('business:update', [dtoStr]));

        player.outputChatBox(`!{44FF88}Zone "${zoneKey}" for business #${id} moved to your position.`);
        break;
      }

      case 'tp': {
        const id = parseInt(args[0]);
        if (isNaN(id)) { player.outputChatBox('!{FFAA00}Usage: /business tp [id]'); return; }

        const b = await svc.findById(id);
        if (!b) { player.outputChatBox(`!{FF4444}Business #${id} not found.`); return; }

        player.position = new mp.Vector3(b.x, b.y, b.z + 0.5);
        player.outputChatBox(`!{44FF88}Teleported to business #${id}.`);
        break;
      }

      case 'toggle': {
        const id = parseInt(args[0]);
        if (isNaN(id)) { player.outputChatBox('!{FFAA00}Usage: /business toggle [id]'); return; }

        const b = await svc.findById(id);
        if (!b) { player.outputChatBox(`!{FF4444}Business #${id} not found.`); return; }

        await svc.setOpen(b, !b.isOpen);
        broadcastUpdate(b);
        player.outputChatBox(`!{44FF88}Business #${id} is now ${b.isOpen ? 'OPEN' : 'CLOSED'}.`);
        break;
      }

      default:
        player.outputChatBox('!{FFAA00}Subcommands: create | delete | list | setowner | setpos | setzone | tp | toggle');

    }
  }
}

void BusinessCommands;
