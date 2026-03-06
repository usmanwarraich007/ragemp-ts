/**
 * dealership-preview.client.ts
 *
 * Handles client-side event bridging for the dealership vehicle preview system.
 *
 * CEF triggers:
 *   dealership:previewVehicle  (model, colorHex) — swap preview model/color
 *   dealership:exitPreview                       — close without buying, restore position
 *
 * Called by DealershipHandler before opening the browse UI:
 *   enterShowcase(businessId) — server spawns preview vehicle + puts player inside
 */

import { clientRpc } from '../../rpc/clientRpc';

// Track whether the local player is currently in a dealership preview session
let isInPreview = false;

// ── CEF → Client event handlers ───────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = (hex ?? '#ffffff').replace('#', '').padEnd(6, '0');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [isNaN(r) ? 255 : r, isNaN(g) ? 255 : g, isNaN(b) ? 255 : b];
}

mp.events.add('dealership:previewVehicle', (model: string, colorHex: string) => {
  void clientRpc.callServer('dealership:changePreview', model, colorHex);
});

mp.events.add('dealership:exitPreview', () => {
  isInPreview = false;
  void clientRpc.callServer('dealership:exitShowcase');
});

/**
 * Server sends this after putIntoVehicle(preview) or before releasing the player.
 * Freeze = true:  lock position + kill engine so player can't drive or exit.
 * Freeze = false: restore movement (called on close / purchase).
 * When freeze=true, colorHex is passed to apply the color immediately via native
 * (setVariable + entityStreamIn can race against the vehicle becoming available).
 */
mp.events.add('dealership:previewFreeze', (freeze: boolean, colorHex?: string) => {
  const local = mp.players.local;
  local.freezePosition(freeze);
  if (freeze) {
    // Short delay so the vehicle entity is fully streamed-in before we touch it
    setTimeout(() => {
      const veh = local.vehicle;
      if (!veh) return;
      veh.setEngineOn(false, true, false);
      if (colorHex) {
        const [r, g, b] = hexToRgb(colorHex);
        veh.setCustomPrimaryColour(r, g, b);
        veh.setCustomSecondaryColour(r, g, b);
      }
    }, 400);
  }
});

/**
 * Fired by the server when the player changes color on the SAME preview model.
 * Applies primary + secondary color directly via client-side natives so the
 * vehicle repaints instantly without needing a re-spawn or stream-in event.
 */
mp.events.add('vehicle:previewRecolor', (colorHex: string) => {
  const veh = mp.players.local.vehicle;
  if (!veh) return;
  const [r, g, b] = hexToRgb(colorHex);
  veh.setCustomPrimaryColour(r, g, b);
  veh.setCustomSecondaryColour(r, g, b);
});

// ── Called by DealershipHandler on "Browse Vehicles" ─────────────────────────

export async function enterShowcase(businessId: number): Promise<boolean> {
  const res = await clientRpc.callServer('dealership:enterShowcase', businessId);
  const ok = (res as { ok: boolean })?.ok ?? false;
  if (ok) isInPreview = true;
  return ok;
}
