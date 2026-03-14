/**
 * vehicle.commands.ts — Admin commands for managing the vehicle model catalog.
 *
 * /vcat list                                              — list all configured models
 * /vcat add <model> <label> <cat> <seats> <sp> <ac> <tr> <br> <price>
 * /vcat delete <model>
 * /vcat colors <model> <#hex,#hex,...>                   — update color palette
 * /vcat tags <model> <tag1,tag2,...>                      — update searchable tags
 *
 * Stock management (restock, price) is done through the CEF owner UI, not commands.
 */

import { Command, log } from '../../core';
import * as catSvc from './vehicle-model-config.service';
import type { VehicleModelConfigDto } from '@ragemp/shared';

class VehicleCommands {
  @Command('vcat', { adminLevel: 1 })
  static async vcat(player: PlayerMp, sub: string, ...args: string[]): Promise<void> {

    switch (sub?.toLowerCase()) {

      // ── list ────────────────────────────────────────────────────────────────
      case 'list': {
        const all = await catSvc.getAll();
        if (all.length === 0) {
          player.outputChatBox('!{FFAA00}No vehicle models configured. Use /vcat add.');
          return;
        }
        player.outputChatBox('!{AAAAAA}── Vehicle Catalog ──');
        for (const c of all) {
          player.outputChatBox(
            `!{FFFFFF}${c.model} · !{AAAAAA}${c.label} [${c.category}] ` +
            `$${c.basePrice.toLocaleString()} · ${c.seats}s · ${c.trunkVolume}L trunk`,
          );
        }
        break;
      }

      // ── add / upsert ────────────────────────────────────────────────────────
      // Usage: /vcat add <model> <label(quoted)> <cat> <seats> <sp> <ac> <tr> <br> <price>
      // e.g.:  /vcat add elegy2 "Elegy Retro" Sports 2 90 85 70 80 30000
      case 'add': {
        // Parse quoted label: join args until an unquoted word appears
        const raw   = args.join(' ');
        const match = raw.match(/^(\S+)\s+"([^"]+)"\s+(\S+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+(?:\.\d+)?)$/);
        if (!match) {
          player.outputChatBox('!{FFAA00}Usage: /vcat add <model> "<Label>" <Category> <seats> <speed> <accel> <traction> <brakes> <basePrice>');
          return;
        }
        const [, model, label, category, seats, speed, accel, traction, brakes, basePrice] = match;
        const dto: VehicleModelConfigDto = {
          model,
          label,
          category,
          seats:            parseInt(seats),
          speed:            parseInt(speed),
          accel:            parseInt(accel),
          traction:         parseInt(traction),
          brakes:           parseInt(brakes),
          basePrice:        parseFloat(basePrice),
          fuelCapacity:     60,
          fuelConsume:      0.8,
          trunkVolume:      100,
          gloveboxCapacity: 10,
          repairCost:       500,
          insuranceCost:    100,
          colors:           ['#ffffff', '#333333', '#000000', '#3498db', '#e74c3c'],
          tags:             [category.toLowerCase()],
        };
        await catSvc.upsert(dto);
        player.outputChatBox(`!{44FF88}Vehicle model "${label}" (${model}) saved.`);
        log.info('[VCat]', `${player.name} upserted model ${model}`);
        break;
      }

      // ── delete ──────────────────────────────────────────────────────────────
      case 'delete': {
        const model = args[0];
        if (!model) { player.outputChatBox('!{FFAA00}Usage: /vcat delete <model>'); return; }

        const ok = await catSvc.deleteByModel(model);
        if (ok) {
          player.outputChatBox(`!{44FF88}Model "${model}" removed from catalog.`);
          log.info('[VCat]', `${player.name} deleted model ${model}`);
        } else {
          player.outputChatBox(`!{FF4444}Model "${model}" not found.`);
        }
        break;
      }

      // ── colors ──────────────────────────────────────────────────────────────
      case 'colors': {
        const [model, colorsRaw] = args;
        if (!model || !colorsRaw) {
          player.outputChatBox('!{FFAA00}Usage: /vcat colors <model> <#hex,#hex,...>');
          return;
        }
        const existing = await catSvc.findByModel(model);
        if (!existing) { player.outputChatBox(`!{FF4444}Model "${model}" not found.`); return; }

        const updated: VehicleModelConfigDto = {
          ...existing,
          colors: colorsRaw.split(',').map((c) => c.trim()),
        };
        await catSvc.upsert(updated);
        player.outputChatBox(`!{44FF88}Colors updated for "${model}".`);
        break;
      }

      // ── tags ────────────────────────────────────────────────────────────────
      case 'tags': {
        const [model, tagsRaw] = args;
        if (!model || !tagsRaw) {
          player.outputChatBox('!{FFAA00}Usage: /vcat tags <model> <tag1,tag2,...>');
          return;
        }
        const existing = await catSvc.findByModel(model);
        if (!existing) { player.outputChatBox(`!{FF4444}Model "${model}" not found.`); return; }

        const updated: VehicleModelConfigDto = {
          ...existing,
          tags: tagsRaw.split(',').map((t) => t.trim()),
        };
        await catSvc.upsert(updated);
        player.outputChatBox(`!{44FF88}Tags updated for "${model}".`);
        break;
      }

      default:
        player.outputChatBox('!{FFAA00}Subcommands: list | add | delete | colors | tags');
    }
  }
}

void VehicleCommands;
