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

// ── Stream-in handler ─────────────────────────────────────────────────────────

mp.events.add('entityStreamIn', (entity: EntityMp) => {
  if (entity.type !== 'vehicle') return;
  const vehicle = entity as VehicleMp;

  // Only process vehicles managed by our system (have a dbId variable)
  const dbId = vehicle.getVariable('dbId') as number | undefined;
  if (!dbId) return;

  // ── Door breakability guard (from reference) ──────────────────────────────
  // On stream-in GTA's physics can cause doors to pop off. Mark them unbreakable
  // for 1.5 s while the vehicle settles, then restore normal breakability.
  for (let i = 0; i < 8; i++) vehicle.setDoorBreakable(i, false);
  setTimeout(() => {
    if (mp.vehicles.exists(vehicle)) {
      for (let i = 0; i < 8; i++) vehicle.setDoorBreakable(i, true);
    }
  }, 1500);
  // ── Custom RGB colors ─────────────────────────────────────────────────────
  const primaryHex   = vehicle.getVariable('colorPrimary')   as string | undefined;
  const secondaryHex = vehicle.getVariable('colorSecondary') as string | undefined;

  if (primaryHex) {
    const [r, g, b] = hexToRgb(primaryHex);
    vehicle.setCustomPrimaryColour(r, g, b);
  }
  if (secondaryHex) {
    const [r, g, b] = hexToRgb(secondaryHex);
    vehicle.setCustomSecondaryColour(r, g, b);
  }

  // ── Pearlescent + wheel color ─────────────────────────────────────────────
  const pearl = vehicle.getVariable('colorPearl') as number | undefined;
  if (pearl !== undefined && pearl > 0) {
    // setExtraColours(pearlescentColor, wheelColor) — pass 0 for wheel to leave default
    vehicle.setExtraColours(pearl, 0);
  }

  // ── Wheel type ────────────────────────────────────────────────────────────
  const wheelType = vehicle.getVariable('wheelType') as number | undefined;
  if (wheelType !== undefined && wheelType > 0) {
    vehicle.setWheelType(wheelType);
  }

  // ── Window tint ───────────────────────────────────────────────────────────
  const windowTint = vehicle.getVariable('windowTint') as number | undefined;
  if (windowTint !== undefined && windowTint > 0) {
    vehicle.setWindowTint(windowTint);
  }

  // ── Neon ──────────────────────────────────────────────────────────────────
  const neonEnabled = vehicle.getVariable('neonEnabled') as boolean | undefined;
  if (neonEnabled) {
    const neonHex = vehicle.getVariable('neonColor') as string | undefined;
    const [r, g, b] = hexToRgb(neonHex ?? '#ff00ff');
    vehicle.setNeonLightsColour(r, g, b);
    // Enable all 4 neon positions: 0=left, 1=right, 2=front, 3=back
    for (let i = 0; i < 4; i++) vehicle.setNeonLightEnabled(i, true);
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

  // ── Engine state (default OFF — must be started manually) ────────────────
  // If the variable is explicitly true the engine was already running; otherwise off.
  const engineOn = vehicle.getVariable('engineOn') as boolean | undefined;
  const isOn = engineOn === true;
  vehicle.setEngineOn(isOn, true, false);
  vehicle.setUndriveable(!isOn); // match reference: undriveable when engine off
  vehicle.setLights(!isOn ? 1 : 0);

  // ── Dirt level (0.0 = clean → 15.0 = filthy) ─────────────────────────────
  const dirt = vehicle.getVariable('dirt') as number | undefined;
  if (dirt !== undefined && dirt > 0) vehicle.setDirtLevel(dirt);

  // ── Health ────────────────────────────────────────────────────────────────
  const engineHealth = vehicle.getVariable('engineHealth') as number | undefined;
  const bodyHealth   = vehicle.getVariable('bodyHealth')   as number | undefined;
  if (engineHealth !== undefined) vehicle.setEngineHealth(engineHealth);
  if (bodyHealth   !== undefined) vehicle.setBodyHealth(bodyHealth);
});

// ── Explicit re-apply (server calls this after retrieve to fix stream-in race) ──
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

    // Colors
    const primaryHex   = vehicle.getVariable('colorPrimary')   as string | undefined;
    const secondaryHex = vehicle.getVariable('colorSecondary') as string | undefined;
    if (primaryHex)   { const [r,g,b] = hexToRgb(primaryHex);   vehicle.setCustomPrimaryColour(r,g,b); }
    if (secondaryHex) { const [r,g,b] = hexToRgb(secondaryHex); vehicle.setCustomSecondaryColour(r,g,b); }

    const pearl    = vehicle.getVariable('colorPearl')  as number | undefined;
    const wheelType = vehicle.getVariable('wheelType')  as number | undefined;
    const windowTint = vehicle.getVariable('windowTint') as number | undefined;
    if (pearl    !== undefined && pearl    > 0) vehicle.setExtraColours(pearl, 0);
    if (wheelType !== undefined && wheelType > 0) vehicle.setWheelType(wheelType);
    if (windowTint !== undefined && windowTint > 0) vehicle.setWindowTint(windowTint);

    // Neon
    const neonEnabled = vehicle.getVariable('neonEnabled') as boolean | undefined;
    if (neonEnabled) {
      const [r,g,b] = hexToRgb(vehicle.getVariable('neonColor') as string ?? '#ff00ff');
      vehicle.setNeonLightsColour(r,g,b);
      for (let i = 0; i < 4; i++) vehicle.setNeonLightEnabled(i, true);
    }

    // Mods — must call setModKit(0) first
    const modsRaw = vehicle.getVariable('mods') as string | undefined;
    if (modsRaw && modsRaw !== '{}') {
      try {
        const mods = JSON.parse(modsRaw) as Record<string, number>;
        vehicle.setModKit(0);
        for (const [typeStr, index] of Object.entries(mods)) {
          vehicle.setMod(Number(typeStr), index);
        }
      } catch { /* malformed mods JSON */ }
    }

    // Dirt + Health
    const dirt         = vehicle.getVariable('dirt')         as number | undefined;
    const engineHealth = vehicle.getVariable('engineHealth') as number | undefined;
    const bodyHealth   = vehicle.getVariable('bodyHealth')   as number | undefined;
    if (dirt         !== undefined && dirt > 0) vehicle.setDirtLevel(dirt);
    if (engineHealth !== undefined) vehicle.setEngineHealth(engineHealth);
    if (bodyHealth   !== undefined) vehicle.setBodyHealth(bodyHealth);
  }, 300); // 300 ms — enough for the vehicle to be fully initialized
});
