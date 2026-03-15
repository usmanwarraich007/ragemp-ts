# Vehicle Features — Progress Tracker

## ✅ Complete & Solid

| File | Notes |
|---|---|
| [vehicle-runtime.ts](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/vehicle-runtime.ts) | In-memory state, all setters sync DB + shared variable atomically |
| [vehicle-manager.server.ts](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/vehicle-manager.server.ts) | Full lifecycle: spawn / despawn / garage / impound / release / saveAll |
| [vehicle-keys.service.ts](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/vehicle-keys.service.ts) | grant / revoke / hasAccess / createOwnerKey |
| [vehicle-mods.service.ts](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/vehicle-mods.service.ts) | applyMod / removeMod / applyToVariable — persistence complete |
| [vehicle-cosmetics.service.ts](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/vehicle-cosmetics.service.ts) | applyToVariables covers all fields |
| [vehicle-door.feature.ts](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/vehicle-door.feature.ts) | Toggle + lock check + vehicleDestroyed cleanup |
| [vehicle-lock.feature.ts](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/vehicle-lock.feature.ts) | toggleLock with key check + unmanaged fallback |
| [vehicle.commands.ts](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/vehicle.commands.ts) | /vcat list / add / delete / colors / tags |

---

## ⚠️ Incomplete / Needs Improvement

### 1. [fuel.service.ts](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/fuel.service.ts) — HIGH PRIORITY
- [x] Fuel drains on exit (straight-line distance)
- [ ] Fuel calculation uses straight-line, not actual driven distance → inaccurate
- [ ] Empty tank does **not** kill/disable the engine
- [ ] No `fuel:refuel` RPC or command
- [ ] `odometer` never explicitly saved (relies solely on autosave timing)

> **Planned improvements** — see detail section below ↓

---

### 2. [vehicle-engine.feature.ts](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/vehicle-engine.feature.ts) — MEDIUM
- [x] `vehicle:setEngine` RPC with key check
- [x] `playerExitVehicle` saves position
- [ ] **Duplicate hook** — [fuel.service.ts](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/fuel.service.ts) also listens on `playerExitVehicle`; one should own position sync
- [ ] No fuel check before allowing engine start (can start an empty vehicle)
- [ ] `import * as pvSvc` is at bottom of file (cosmetic but confusing)

---

### 3. Mods — Missing live-update path — MEDIUM
- [x] [applyMod](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/vehicle-mods.service.ts#15-24) / [removeMod](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/vehicle-mods.service.ts#25-28) write to DB
- [x] Variables set on spawn via [applyToVariable](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/vehicle-mods.service.ts#29-34)
- [ ] No function to **push a mod change to the live vehicle variable** after a mod shop purchase
- [ ] [VehicleRuntime](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/vehicle-runtime.ts#7-62) has no `updateMods()` helper — callers must re-query manually

---

### 4. Cosmetics — Missing live-update path — MEDIUM
- [x] [applyToVariables](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/vehicle-cosmetics.service.ts#40-54) sets all variables on spawn
- [ ] No **"save cosmetic + update live variable"** combined function
- [ ] No RPC or command to change cosmetics on a live vehicle (tuning shop would need this)

---

### 5. Vehicle health — never persisted — HIGH
- [x] `VehicleRuntime.setHealth()` exists
- [ ] Nothing reads `vehicle.getEngineHealth()` / [getBodyHealth()](file:///f:/Development/Rage%20Development/ragemp-ts/ragemp-vehiclemp-typescript.ts#38-39) and calls [setHealth()](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/vehicle-runtime.ts#31-37)
- [ ] Health is lost between sessions (always resets to GTA default on spawn)

---

### 6. Dirt level — never persisted — LOW
- [x] `VehicleRuntime.setDirt()` exists
- [ ] Nothing reads dirt from the vehicle and persists it

---

### 7. Keys — no in-game UI or commands — LOW
- [x] Full DB service (grant/revoke/hasAccess)
- [ ] No RPCs or `/vkey` commands to give/take keys in-game
- [ ] Key management only happens programmatically at purchase

---

## 📋 Improvement Plan — #1: Fuel Enforcement

### Problem Summary
[fuel.service.ts](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/fuel.service.ts) tracks fuel but has no enforcement. A vehicle with 0 fuel runs
indefinitely. Fuel also only drains on `playerExitVehicle`, so distance is
approximated as a straight line from entry position to exit position — very wrong
for vehicles driven on a track or in circles.

### Proposed Design

#### A — Accurate fuel drain via periodic tick
Replace the exit-position delta with a **server-side interval** that reads actual
displacement since the last tick rather than total entry-to-exit delta.

```
Every N seconds (e.g. 5s):
  for each runtime in vehicleManager.byMpId where a driver is seated:
    distance = vector3Distance(vehicle.position, runtime.lastTickPos)
    fuel -= distance / 1000 * config.fuelConsume
    runtime.lastTickPos = vehicle.position
    runtime.dbRow.odometer += distance / 1000
    if fuel <= 0: enforce empty tank (see B)
```

**Why a tick instead of exit delta?**
- Captures circular/back-and-forth routes correctly
- Allows real-time HUD updates on the client (send `fuel` variable update each tick)
- Enables empty-tank enforcement mid-drive

#### B — Empty tank enforcement
When fuel reaches 0 mid-tick:
1. `runtime.setFuel(0)` — clamps and broadcasts variable
2. `runtime.setEngine(false)` — sets `engineOn` variable to false (client applies it)
3. Call `player.call('vehicle:engineKilled', [])` on the driver so the client
   can apply `vehicle.setEngineOn(false, true, false)` and show a "Out of fuel" notification

In `vehicle:setEngine` RPC — before allowing engine start:
```typescript
if (runtime.dbRow.fuel <= 0) {
  notify(player).screen.error('Out of fuel.');
  return { ok: false };
}
```

#### C — Refuel RPC / command
A `/refuel` command (or interaction at a gas station zone):
```
vehicle:refuel(player, amount: number)
  → runtime.setFuel(runtime.dbRow.fuel + amount)
  → deduct cost from player cash
  → notify success
```

#### D — Odometer save
`odometer` is mutated on `runtime.dbRow` but only saved when the vehicle is
despawned/autosaved. This is fine — no change needed on the persistence side,
just make sure [saveAll()](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/vehicle-manager.server.ts#163-172) is called on a reasonable autosave interval (already
wired in `server/index.ts`).

### Files to Change

| File | Change |
|---|---|
| [fuel.service.ts](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/fuel.service.ts) | Replace exit-delta with tick loop; add enforcement logic |
| [vehicle-runtime.ts](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/vehicle-runtime.ts) | Add `lastTickPos` field; expose [setEngine](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/vehicle-runtime.ts#43-46) to also notify driver |
| [vehicle-engine.feature.ts](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/server/features/vehicles/vehicle-engine.feature.ts) | Add fuel > 0 check before engine start |
| [vehicle-stream.ts](file:///f:/Development/Rage%20Development/ragemp-ts/rage-server-client/src/client/vehicles/vehicle-stream.ts) *(client)* | Handle `vehicle:engineKilled` event |
| `server/index.ts` | Register the fuel tick interval |

### Tick Interval Recommendation
5-second interval is a good balance between accuracy and server load.
At 60 km/h a vehicle moves ~83 m in 5 s — acceptable margin of error for fuel.
