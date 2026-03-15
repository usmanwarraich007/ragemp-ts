/**
 * vehicle-stream.ts — Client-side vehicle visual applicator.
 *
 * When the server spawns a PlayerVehicle via VehicleManager, it stores all
 * visual state as shared variables (setVariable). This script reads those
 * variables on every vehicle stream-in and applies them via client-side natives.
 *
 * Correct RAGE:MP pattern: server stores state, client applies visuals on stream-in.
 */

// ── Hex → RGB ─────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = (hex || '#ffffff').replace('#', '').padEnd(6, '0');
  return [
    parseInt(clean.substring(0, 2), 16) || 255,
    parseInt(clean.substring(2, 4), 16) || 255,
    parseInt(clean.substring(4, 6), 16) || 255,
  ];
}

// ── Core visual applicator ────────────────────────────────────────────────────
//
// Single source of truth for reading server-set shared variables and applying
// them via client-side natives. Called from both entityStreamIn and
// vehicle:applyVisuals so there is no duplicated logic between the two paths.

function applyVehicleVisuals(vehicle: VehicleMp): void {
  // ── Custom RGB colors ─────────────────────────────────────────────────────
  const primaryHex   = vehicle.getVariable('colorPrimary')   as string | undefined;
  const secondaryHex = vehicle.getVariable('colorSecondary') as string | undefined;
  if (primaryHex)   { const [r, g, b] = hexToRgb(primaryHex);   vehicle.setCustomPrimaryColour(r, g, b); }
  if (secondaryHex) { const [r, g, b] = hexToRgb(secondaryHex); vehicle.setCustomSecondaryColour(r, g, b); }

  // ── Pearlescent + wheel color ─────────────────────────────────────────────
  const pearl      = vehicle.getVariable('colorPearl')  as number | undefined;
  const wheelColor = vehicle.getVariable('wheelColor')  as number | undefined;
  // setExtraColours(pearlescentColor, wheelColor) — both persist on the vehicle
  if (pearl !== undefined || wheelColor !== undefined) {
    vehicle.setExtraColours(pearl ?? 0, wheelColor ?? 0);
  }

  // ── Wheel type ────────────────────────────────────────────────────────────
  const wheelType = vehicle.getVariable('wheelType') as number | undefined;
  if (wheelType !== undefined && wheelType > 0) vehicle.setWheelType(wheelType);

  // ── Window tint ───────────────────────────────────────────────────────────
  const windowTint = vehicle.getVariable('windowTint') as number | undefined;
  if (windowTint !== undefined && windowTint > 0) vehicle.setWindowTint(windowTint);

  // ── Livery ────────────────────────────────────────────────────────────────
  const livery = vehicle.getVariable('livery') as number | undefined;
  if (livery !== undefined && livery >= 0) vehicle.setLivery(livery);

  // ── Neon ──────────────────────────────────────────────────────────────────
  // Server stores neon as separate R/G/B integers (neonColorR/G/B), not a hex string.
  const neonEnabled = vehicle.getVariable('neonEnabled') as boolean | undefined;
  if (neonEnabled) {
    const r = (vehicle.getVariable('neonColorR') as number | undefined) ?? 255;
    const g = (vehicle.getVariable('neonColorG') as number | undefined) ?? 0;
    const b = (vehicle.getVariable('neonColorB') as number | undefined) ?? 255;
    vehicle.setNeonLightsColour(r, g, b);
    // Enable all 4 neon positions: 0=left, 1=right, 2=front, 3=back
    for (let i = 0; i < 4; i++) vehicle.setNeonLightEnabled(i, true);
  }

  // ── Xenon headlights ──────────────────────────────────────────────────────
  // Xenon headlights are mod type 22 in GTA (a boolean toggle mod).
  // xenonColor > 0 means xenon is enabled in the DB.
  const xenonColor = vehicle.getVariable('xenonColor') as number | undefined;
  if (xenonColor !== undefined && xenonColor > 0) {
    vehicle.toggleMod(22, true); // modType 22 = xenon headlights
  }

  // ── Mods ──────────────────────────────────────────────────────────────────
  const modsRaw = vehicle.getVariable('mods') as string | undefined;
  if (modsRaw && modsRaw !== '{}') {
    try {
      const mods = JSON.parse(modsRaw) as Record<string, number>;
      vehicle.setModKit(0); // required before setMod calls
      for (const [typeStr, index] of Object.entries(mods)) {
        vehicle.setMod(Number(typeStr), index);
      }
    } catch {
      // Malformed mods JSON — skip silently
    }
  }

  // ── Dirt level (0.0 = clean → 15.0 = filthy) ─────────────────────────────
  const dirt = vehicle.getVariable('dirt') as number | undefined;
  if (dirt !== undefined && dirt > 0) vehicle.setDirtLevel(dirt);

  // ── Health ────────────────────────────────────────────────────────────────
  const engineHealth = vehicle.getVariable('engineHealth') as number | undefined;
  const bodyHealth   = vehicle.getVariable('bodyHealth')   as number | undefined;
  if (engineHealth !== undefined) vehicle.setEngineHealth(engineHealth);
  if (bodyHealth   !== undefined) vehicle.setBodyHealth(bodyHealth);
}

// ── Stream-in handler ─────────────────────────────────────────────────────────

mp.events.add('entityStreamIn', (entity: EntityMp) => {
  if (entity.type !== 'vehicle') return;
  const vehicle = entity as VehicleMp;

  // Only process vehicles managed by our system (have a dbId variable)
  const dbId = vehicle.getVariable('dbId') as number | undefined;
  if (!dbId) return;

  // ── Door breakability guard ───────────────────────────────────────────────
  // On stream-in GTA's physics can cause doors to pop off. Mark them unbreakable
  // for 1.5 s while the vehicle settles, then restore normal breakability.
  for (let i = 0; i < 8; i++) vehicle.setDoorBreakable(i, false);
  setTimeout(() => {
    if (mp.vehicles.exists(vehicle)) {
      for (let i = 0; i < 8; i++) vehicle.setDoorBreakable(i, true);
    }
  }, 1500);

  // ── Engine state (default OFF — must be started manually) ─────────────────
  const engineOn = vehicle.getVariable('engineOn') as boolean | undefined;
  const isOn = engineOn === true;
  vehicle.setEngineOn(isOn, true, false);
  vehicle.setUndriveable(!isOn);
  vehicle.setLights(!isOn ? 1 : 0);

  applyVehicleVisuals(vehicle);
});

// ── Explicit re-apply (server calls this after spawn to fix stream-in race) ───
// When a vehicle is spawned close to the player, entityStreamIn fires BEFORE
// the server has finished setting shared variables, so mods/colors are missing.
// The server sends this event right after spawn to force a re-apply.
mp.events.add('vehicle:applyVisuals', (remoteId: number) => {
  // Small delay so GTA has finished loading the vehicle entity on this frame.
  setTimeout(() => {
    const vehicle = mp.vehicles.atRemoteId(remoteId);
    if (!vehicle || !mp.vehicles.exists(vehicle)) return;

    const dbId = vehicle.getVariable('dbId') as number | undefined;
    if (!dbId) return; // not a managed vehicle

    applyVehicleVisuals(vehicle);
  }, 300); // 300 ms — enough for the vehicle to be fully initialized
});

// ── Engine killed (out of fuel) ───────────────────────────────────────────────
// Server sends this when the fuel tick drains the tank to 0 while engine is on.
// The server already shows the toast — we only apply the GTA native state here.
mp.events.add('vehicle:engineKilled', () => {
  const vehicle = mp.players.local.vehicle;
  if (!vehicle) return;
  vehicle.setEngineOn(false, true, false);
  vehicle.setUndriveable(true);
  vehicle.setLights(1);
});

// ── Door state sync ───────────────────────────────────────────────────────────
// Server sets vehicle.setVariable('door:N', isOpen) — only clients that have
// the vehicle streamed in receive the update (no server-wide broadcast).
// addDataHandler fires the native locally so the door opens/closes for nearby players.
for (let i = 0; i < 6; i++) {
  const doorIndex = i;
  mp.events.addDataHandler(`door:${doorIndex}`, (entity: EntityMp, value: unknown) => {
    if (entity.type !== 'vehicle') return;
    const vehicle = entity as VehicleMp;
    // setDoorOpen(doorIndex, loose, instantly) — instantly=false gives animation
    // setDoorShut is required to close; setDoorOpen cannot close a door
    if (Boolean(value)) vehicle.setDoorOpen(doorIndex, false, false);
    else                vehicle.setDoorShut(doorIndex, true);
  });
}
