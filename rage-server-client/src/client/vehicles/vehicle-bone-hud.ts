/**
 * vehicle-bone-hud.ts — All vehicle bone interactions in one unified file.
 *
 * Handles: driver/passenger doors (front + rear), bonnet, AND trunk (boot).
 * All bones register via entityStreamIn/Out — no per-frame scanning.
 *
 * All use 'vehicle:door:toggle' RPC (doorIndex 5 = trunk).
 * All use 'vehicle:door:apply' to run the door native locally.
 */

import { registry }  from '../interaction';
import { clientRpc } from '../rpc/clientRpc';
import type { InteractableMenuItem } from '../interaction';

// ── Bone config ─────────────────────────────────────────────────────────────

interface BoneConfig {
  boneName:     string;
  handleBone:   string;
  friendlyName: string;
  doorIndex:    number;
  /** Extra items beyond the default Use/Enter */
  extraItems?:  InteractableMenuItem[];
}

const BONE_CONFIGS: BoneConfig[] = [
  { boneName: 'door_dside_f', handleBone: 'handle_dside_f', friendlyName: 'Driver Door',          doorIndex: 0 },
  { boneName: 'door_pside_f', handleBone: 'handle_pside_f', friendlyName: 'Passenger Door',       doorIndex: 1 },
  { boneName: 'door_dside_r', handleBone: 'handle_dside_r', friendlyName: 'Driver Rear Door',     doorIndex: 2 },
  { boneName: 'door_pside_r', handleBone: 'handle_pside_r', friendlyName: 'Passenger Rear Door',  doorIndex: 3 },
  { boneName: 'bonnet',       handleBone: 'bonnet',         friendlyName: 'Hood',                 doorIndex: 4 },
  {
    boneName:    'boot',
    handleBone:  'boot',
    friendlyName: 'Trunk',
    doorIndex:    5,
    extraItems:  [
      { label: 'Search', action: 'search' },
      { label: 'Store',  action: 'store'  },
    ],
  },
];

const LABEL_RADIUS = 2.5;

// ── Helpers ─────────────────────────────────────────────────────────────────

function getBonePos(vehicle: VehicleMp, boneName: string): Vector3 | null {
  const idx = vehicle.getBoneIndexByName(boneName);
  if (idx === -1) return null;
  return mp.game.entity.getWorldPositionOfBone(vehicle.handle, idx);
}

function getLabelPos(vehicle: VehicleMp, cfg: BoneConfig): Vector3 | null {
  return getBonePos(vehicle, cfg.handleBone) ?? getBonePos(vehicle, cfg.boneName);
}

function isDoorOpen(vehicle: VehicleMp, doorIndex: number): boolean {
  return vehicle.getDoorAngleRatio(doorIndex) > 0.1;
}

// ── Per-bone interactable factory ────────────────────────────────────────────

function makeBoneInteractable(vehicle: VehicleMp, cfg: BoneConfig) {
  const items: InteractableMenuItem[] = [
    { label: 'Use',   action: 'use'   },
    { label: 'Enter', action: 'enter' },
    ...(cfg.extraItems ?? []),
  ];

  return {
    id:          `veh-${vehicle.remoteId}-${cfg.boneName}`,
    label:       cfg.friendlyName,
    labelRadius: LABEL_RADIUS,
    menuTitle:   '', // proximity label from registry already names the bone

    getPosition() {
      try { return getLabelPos(vehicle, cfg); }
      catch { return null; }
    },

    // ── Lock gate: all vehicle parts (doors, hood, trunk) require unlock ────
    canInteract(): boolean | string {
      const locked = vehicle.getVariable('locked') as boolean | undefined;
      if (locked) return 'Vehicle is locked.';
      return true;
    },

    items,

    onSelect(action: string): void {
      switch (action) {
        case 'use':
          void (async () => {
            try {
              const res = await clientRpc.callServer(
                'vehicle:door:toggle',
                vehicle.remoteId,
                cfg.doorIndex,
                isDoorOpen(vehicle, cfg.doorIndex), // actual native state — server inverts this
              );
              mp.gui.chat.push(
                res.isOpen
                  ? `!{44FF88}${cfg.friendlyName} opened.`
                  : `!{FFAA00}${cfg.friendlyName} closed.`,
              );
            } catch {
              mp.gui.chat.push(`!{FF4444}Failed to toggle ${cfg.friendlyName}.`);
            }
          })();
          break;

        case 'enter':
          mp.gui.chat.push(`!{FFAA00}[Mock] Enter ${cfg.friendlyName} — not yet implemented.`);
          break;

        case 'search':
          mp.gui.chat.push('!{FFAA00}[Mock] Search trunk — not yet implemented.');
          break;

        case 'store':
          mp.gui.chat.push('!{FFAA00}[Mock] Store item — not yet implemented.');
          break;
      }
    },
  };
}

// ── Per-vehicle registration ─────────────────────────────────────────────────

function registerVehicle(vehicle: VehicleMp): void {
  for (const cfg of BONE_CONFIGS) {
    if (vehicle.getBoneIndexByName(cfg.boneName) === -1) continue;
    registry.register(makeBoneInteractable(vehicle, cfg));
  }
}

function unregisterVehicle(vehicle: VehicleMp): void {
  for (const cfg of BONE_CONFIGS) {
    registry.unregister(`veh-${vehicle.remoteId}-${cfg.boneName}`);
  }
}

// ── Stream events ────────────────────────────────────────────────────────────

mp.events.add('entityStreamIn', (entity: EntityMp) => {
  if (entity.type !== 'vehicle') return;
  registerVehicle(entity as VehicleMp);
});

mp.events.add('entityStreamOut', (entity: EntityMp) => {
  if (entity.type !== 'vehicle') return;
  unregisterVehicle(entity as VehicleMp);
});

// Register vehicles already in stream at load time
mp.vehicles.toArray().forEach(registerVehicle);

// ── Apply door state from server ─────────────────────────────────────────────
//
// Server broadcasts 'vehicle:door:apply' after any door/trunk toggle.
// We run the native here — setDoorOpen/setDoorShut are client-only calls.

mp.events.add('vehicle:door:apply', (vehicleRemoteId: number, doorIndex: number, isOpen: boolean) => {
  const vehicle = mp.vehicles.atRemoteId(vehicleRemoteId);
  if (!vehicle?.handle) return;
  if (isOpen) vehicle.setDoorOpen(doorIndex, false, false);
  else        vehicle.setDoorShut(doorIndex, false);
});
