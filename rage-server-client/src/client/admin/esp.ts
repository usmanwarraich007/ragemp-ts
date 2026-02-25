/**
 * admin/esp.ts — Enhanced ESP overlay.
 *
 * Cycles through modes via /esp:
 *   0 = Off
 *   1 = Players only
 *   2 = Vehicles only
 *   3 = Players + Vehicles
 *
 * Uses forEachInStreamRange for performance (nearby entities only).
 * Draws text at 3D world position — no screen projection needed.
 */

let espMode = 0;
const ESP_MODES = ['~r~Disabled', '~g~Players', '~g~Vehicles', '~g~Players + Vehicles'];

// ── Render ────────────────────────────────────────────────────────────────────

mp.events.add('render', () => {
  if (espMode === 0) return;

  const local    = mp.players.local;
  const localPos = local.position;
  if (!localPos || localPos.x == null) return;

  // ── Players ───────────────────────────────────────────────────────────────
  if (espMode === 1 || espMode === 3) {
    mp.players.forEachInStreamRange(p => {
      try {
        if (p.handle === 0 || p.remoteId === local.remoteId) return;

        const pos = p.position;
        if (!pos || pos.x == null) return;

        const dist = Math.round(mp.game.system.vdist(pos.x, pos.y, pos.z, localPos.x, localPos.y, localPos.z));
        const hp   = p.getHealth() ?? 0;
        const ar   = p.getArmour() ?? 0;

        let color: [number, number, number, number];
        if (hp > 150) color = [0, 255, 100, 255];
        else if (hp > 120) color = [255, 210, 0, 255];
        else color = [255, 60, 60, 255];

        mp.game.graphics.drawText(
          `${p.name} (${p.remoteId})\n${dist}m | ${hp} HP | ${ar} AR`,
          [pos.x, pos.y, pos.z + 1.5],
          { font: 4, scale: [0.3, 0.3], outline: true, color },
        );
      } catch {
        // Skip broken entities silently
      }
    });
  }

  // ── Vehicles ─────────────────────────────────────────────────────────────
  if (espMode === 2 || espMode === 3) {
    mp.vehicles.forEachInStreamRange(v => {
      try {
        if (v.handle === 0 || v === local.vehicle) return;

        const pos = v.position;
        if (!pos || pos.x == null) return;

        const dist  = Math.round(mp.game.system.vdist(pos.x, pos.y, pos.z, localPos.x, localPos.y, localPos.z));
        const model = mp.game.vehicle.getDisplayNameFromVehicleModel(v.model) ?? 'Vehicle';
        const speed = Math.round((v.getSpeed() ?? 0) * 3.6);
        const eHp   = Math.round(v.getEngineHealth() ?? 0);

        mp.game.graphics.drawText(
          `${model}\n${dist}m | ${speed} km/h | Eng: ${eHp}`,
          [pos.x, pos.y, pos.z + 0.5],
          { font: 4, scale: [0.28, 0.28], outline: true, color: [255, 255, 255, 180] },
        );
      } catch {
        // Skip broken entities silently
      }
    });
  }
});

// ── Toggle ────────────────────────────────────────────────────────────────────

mp.events.add('admin:espToggle', () => {
  espMode = (espMode + 1) % 4;
  mp.game.graphics.notify(`ESP: ${ESP_MODES[espMode]}`);
});

export {};
