"use strict";
// ========================================
// CLIENT-SIDE VEHICLE INTERACTION SYSTEM
// All code in one file for RageMP compatibility
// ========================================
function raycastFromCamera(distance = 10.0) {
    const player = mp.players.local;
    if (!player || !player.handle) {
        return null;
    }
    // [FIX 1] Use 'getGameplayCoord' (fixes the TS error)
    // This starts the ray exactly at the camera lens
    const startPos = mp.game.cam.getGameplayCoord();
    const camRot = mp.game.cam.getGameplayCamRot(2);
    const rotZ = camRot.z * (Math.PI / 180);
    const rotX = camRot.x * (Math.PI / 180);
    const dirX = -Math.sin(rotZ) * Math.cos(rotX);
    const dirY = Math.cos(rotZ) * Math.cos(rotX);
    const dirZ = Math.sin(rotX);
    const endPos = new mp.Vector3(startPos.x + dirX * distance, startPos.y + dirY * distance, startPos.z + dirZ * distance);
    // Flags: 1 | 2 | 4 | 16 = World + Vehicles + Peds + Objects
    // We INCLUDE ped collision (flag 4) but pass player as ignored entity
    // This allows ray to pass through the player but detect other peds/vehicles
    const raycast = mp.raycasting.testPointToPoint(startPos, endPos, player, // Ignore local player specifically
    1 | 2 | 4 | 16 // Include all entity types
    );
    if (!raycast) {
        return null;
    }
    const entity = raycast.entity;
    // Double check we actually hit a vehicle
    if (!entity || entity.type !== 'vehicle') {
        return null;
    }
    return {
        entity: entity,
        position: raycast.position,
        surfaceNormal: raycast.surfaceNormal,
        boneIndex: getBoneIndexAtPosition(entity, raycast.position)
    };
}
function getBoneIndexAtPosition(entity, position) {
    if (entity.type !== 'vehicle') {
        return -1;
    }
    const vehicle = entity;
    // Check handle bones first (more accurate for interaction)
    const handleBones = [
        'handle_dside_f',
        'handle_pside_f',
        'handle_dside_r',
        'handle_pside_r'
    ];
    // Also check door bones and other parts
    const doorBones = [
        'door_dside_f',
        'door_pside_f',
        'door_dside_r',
        'door_pside_r',
        'bonnet',
        'boot'
    ];
    let closestBone = -1;
    let closestDistance = 0.5;
    let closestBoneName = '';
    // First, check handle bones (priority)
    for (const boneName of handleBones) {
        const boneIndex = vehicle.getBoneIndexByName(boneName);
        if (boneIndex === -1)
            continue;
        const bonePos = mp.game.entity.getWorldPositionOfBone(vehicle.handle, boneIndex);
        const distance = mp.game.system.vdist(position.x, position.y, position.z, bonePos.x, bonePos.y, bonePos.z);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestBone = boneIndex;
            closestBoneName = boneName;
        }
    }
    // If no handle bone found, check bonnet and boot (they don't have handle bones)
    if (closestBone === -1) {
        const specialBones = ['bonnet', 'boot'];
        for (const boneName of specialBones) {
            const boneIndex = vehicle.getBoneIndexByName(boneName);
            if (boneIndex === -1)
                continue;
            const bonePos = mp.game.entity.getWorldPositionOfBone(vehicle.handle, boneIndex);
            const distance = mp.game.system.vdist(position.x, position.y, position.z, bonePos.x, bonePos.y, bonePos.z);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestBone = boneIndex;
            }
        }
    }
    return closestBone;
}
function getBoneHandlePosition(vehicle, boneName) {
    // Map door bones to their corresponding handle bones
    const handleBoneMap = {
        'door_dside_f': 'handle_dside_f',
        'door_pside_f': 'handle_pside_f',
        'door_dside_r': 'handle_dside_r',
        'door_pside_r': 'handle_pside_r',
        'bonnet': 'bonnet', // Hood doesn't have a separate handle bone
        'boot': 'boot' // Trunk doesn't have a separate handle bone
    };
    const handleBoneName = handleBoneMap[boneName] || boneName;
    const handleBoneIndex = vehicle.getBoneIndexByName(handleBoneName);
    // If handle bone exists, use it; otherwise fall back to the door bone
    if (handleBoneIndex !== -1) {
        return mp.game.entity.getWorldPositionOfBone(vehicle.handle, handleBoneIndex);
    }
    // Fallback to door bone if handle bone doesn't exist
    const boneIndex = vehicle.getBoneIndexByName(boneName);
    return mp.game.entity.getWorldPositionOfBone(vehicle.handle, boneIndex);
}
function getBoneName(vehicle, boneIndex) {
    // Check handle bones first and map them to door names
    const handleBoneMap = {
        'handle_dside_f': 'door_dside_f',
        'handle_pside_f': 'door_pside_f',
        'handle_dside_r': 'door_dside_r',
        'handle_pside_r': 'door_pside_r'
    };
    for (const [handleBone, doorBone] of Object.entries(handleBoneMap)) {
        const index = vehicle.getBoneIndexByName(handleBone);
        if (index === boneIndex) {
            return doorBone; // Return the door name for consistency
        }
    }
    // Check regular door bones
    const boneNames = [
        'door_dside_f',
        'door_pside_f',
        'door_dside_r',
        'door_pside_r',
        'bonnet',
        'boot'
    ];
    for (const boneName of boneNames) {
        const index = vehicle.getBoneIndexByName(boneName);
        if (index === boneIndex) {
            return boneName;
        }
    }
    return null;
}
function getFriendlyBoneName(boneName) {
    const nameMap = {
        'door_dside_f': 'Driver Front Door',
        'door_pside_f': 'Passenger Front Door',
        'door_dside_r': 'Driver Rear Door',
        'door_pside_r': 'Passenger Rear Door',
        'bonnet': 'Hood',
        'boot': 'Trunk'
    };
    return nameMap[boneName] || boneName;
}
// ============ INTERACTION HUD ============
class InteractionHUD {
    constructor() {
        this.targetedBone = null;
        this.targetedVehicle = null;
        this.targetedPosition = null;
        this.targetedState = false;
    }
    setTarget(vehicle, boneName, position, state) {
        this.targetedVehicle = vehicle;
        this.targetedBone = boneName;
        this.targetedPosition = position;
        this.targetedState = state;
    }
    draw() {
        const player = mp.players.local;
        if (!player)
            return;
        // Don't show labels when player is in a vehicle
        if (player.vehicle)
            return;
        // Only show the native weapon reticle when targeting a bone
        if (this.targetedBone !== null) {
            mp.game.ui.showHudComponentThisFrame(14); // 14 = HUD_RETICLE
        }
        // Find nearby vehicles and draw labels for all their bones
        const playerPos = player.position;
        const nearbyVehicles = mp.vehicles.toArray().filter(v => {
            const dist = mp.game.system.vdist(playerPos.x, playerPos.y, playerPos.z, v.position.x, v.position.y, v.position.z);
            return dist < 3.0; // Only show labels for vehicles within 10 meters
        });
        for (const vehicle of nearbyVehicles) {
            this.drawVehicleBoneLabels(vehicle);
        }
    }
    drawVehicleBoneLabels(vehicle) {
        const player = mp.players.local;
        if (!player)
            return;
        const playerPos = player.position;
        const bones = [
            'door_dside_f',
            'door_pside_f',
            'door_dside_r',
            'door_pside_r',
            'bonnet',
            'boot'
        ];
        // Maximum distance to show a bone label
        const maxBoneDistance = 2.0; // Adjust this to control how many labels are visible
        // Draw labels for all bones within the distance threshold
        for (const boneName of bones) {
            const boneIndex = vehicle.getBoneIndexByName(boneName);
            if (boneIndex === -1)
                continue;
            const handlePos = getBoneHandlePosition(vehicle, boneName);
            const distance = mp.game.system.vdist(playerPos.x, playerPos.y, playerPos.z, handlePos.x, handlePos.y, handlePos.z);
            // Only show label if within distance threshold
            if (distance < maxBoneDistance) {
                const screenCoords = mp.game.graphics.world3dToScreen2d(handlePos);
                if (screenCoords && screenCoords.x && screenCoords.y) {
                    const friendlyName = getFriendlyBoneName(boneName);
                    const isTargeted = this.targetedVehicle === vehicle && this.targetedBone === boneName;
                    // Draw the bone name
                    mp.game.graphics.drawText(friendlyName, [screenCoords.x, screenCoords.y - 0.02], {
                        font: 4,
                        color: isTargeted ? [255, 255, 100, 255] : [200, 200, 200, 200],
                        scale: [0.35, 0.35],
                        outline: true,
                        centre: true
                    });
                    // Only draw interaction prompt if this bone is targeted
                    if (isTargeted) {
                        const action = this.targetedState ? 'Close' : 'Open';
                        mp.game.graphics.drawText(`[E] ${action}`, [screenCoords.x, screenCoords.y + 0.01], {
                            font: 4,
                            color: [255, 255, 255, 255],
                            scale: [0.4, 0.4],
                            outline: true,
                            centre: true
                        });
                    }
                }
            }
        }
    }
    get visible() {
        return this.targetedBone !== null;
    }
}
const interactionHUD = new InteractionHUD();
// ============ BONE DEBUG VISUALIZER ============
class VehicleBoneDebugVisualizer {
    constructor() {
        this.enabled = false;
        this.toggleKey = 0x76; // F7 key
        this.maxDistance = 10.0; // Maximum distance to show bones
        // Comprehensive list of all vehicle bones
        this.allBones = [
            // Chassis and Structural
            'chassis', 'chassis_lowlod', 'chassis_dummy', 'chassis_Control', 'bodyshell',
            'bonnet', 'boot', 'bumper_f', 'bumper_r',
            'wing_rf', 'wing_lf', 'wing_l', 'wing_r',
            // Doors and Handles
            'door_dside_f', 'door_dside_r', 'door_pside_f', 'door_pside_r',
            'door_hatch_l', 'door_hatch_r',
            'handle_dside_f', 'handle_dside_r', 'handle_pside_f', 'handle_pside_r',
            // Windows
            'windscreen', 'windscreen_r', 'windscreen_f',
            'window_lf', 'window_rf', 'window_lr', 'window_rr',
            'window_lm', 'window_rm',
            'window_lf1', 'window_lf2', 'window_lf3',
            'window_rf1', 'window_rf2', 'window_rf3',
            'window_lr1', 'window_lr2', 'window_lr3',
            'window_rr1', 'window_rr2', 'window_rr3',
            // Wheels and Suspension
            'wheel_lf', 'wheel_rf', 'wheel_lr', 'wheel_rr',
            'wheel_lm1', 'wheel_rm1', 'wheel_lm2', 'wheel_rm2', 'wheel_lm3', 'wheel_rm3',
            'suspension_lf', 'suspension_rf', 'suspension_lr', 'suspension_rr',
            'suspension_lm', 'suspension_rm',
            'spring_rf', 'spring_lf', 'spring_rr', 'spring_lr',
            'hub_lf', 'hub_rf', 'hub_lr', 'hub_rr',
            'hub_lm1', 'hub_rm1', 'hub_lm2', 'hub_rm2', 'hub_lm3', 'hub_rm3',
            // Engine and Transmission
            'engine', 'engine_l', 'engine_r',
            'transmission_f', 'transmission_m', 'transmission_r',
            'overheat', 'overheat_2',
            'petrolcap', 'petroltank', 'petroltank_l', 'petroltank_r',
            // Lights
            'headlight_l', 'headlight_r', 'taillight_l', 'taillight_r',
            'indicator_lf', 'indicator_rf', 'indicator_lr', 'indicator_rr',
            'brakelight_l', 'brakelight_r', 'brakelight_m',
            'reversinglight_l', 'reversinglight_r',
            'extralight_1', 'extralight_2', 'extralight_3', 'extralight_4',
            'interiorlight', 'doorlight_lf', 'doorlight_rf', 'doorlight_lr', 'doorlight_rr',
            'platelight', 'numberplate',
            // Seats
            'seat_dside_f', 'seat_pside_f', 'seat_dside_r', 'seat_pside_r',
            'seat_dside_r1', 'seat_dside_r2', 'seat_dside_r3',
            'seat_pside_r1', 'seat_pside_r2', 'seat_pside_r3',
            // Exhausts
            'exhaust', 'exhaust_2', 'exhaust_3', 'exhaust_4', 'exhaust_5',
            'exhaust_6', 'exhaust_7', 'exhaust_8', 'exhaust_9',
            // Steering
            'steering', 'steeringwheel', 'hbgrip_l', 'hbgrip_r', 'handlebars',
            // Miscellaneous
            'attach_male', 'attach_female',
            'neon_l', 'neon_r', 'neon_f', 'neon_b',
            'dials', 'dashglow',
            'misc_a', 'misc_b', 'misc_c', 'misc_d', 'misc_e', 'misc_f',
            // Aircraft specific
            'rotor_main', 'rotor_rear', 'tail',
            'elevator_l', 'elevator_r', 'rudder_l', 'rudder_r',
            // Bike specific
            'forks_u', 'forks_l', 'swingarm',
            'crank', 'pedal_r', 'pedal_l'
        ];
    }
    init() {
        mp.keys.bind(this.toggleKey, true, this.toggle.bind(this));
        mp.events.add('render', this.onRender.bind(this));
        mp.console.logInfo('Vehicle bone debug visualizer initialized (F7 to toggle)');
    }
    toggle() {
        this.enabled = !this.enabled;
        mp.gui.chat.push(this.enabled ?
            '~g~Vehicle Bone Debug: ENABLED' :
            '~r~Vehicle Bone Debug: DISABLED');
    }
    onRender() {
        if (!this.enabled)
            return;
        const player = mp.players.local;
        if (!player)
            return;
        const playerPos = player.position;
        // Find nearby vehicles
        const nearbyVehicles = mp.vehicles.toArray().filter(v => {
            const dist = mp.game.system.vdist(playerPos.x, playerPos.y, playerPos.z, v.position.x, v.position.y, v.position.z);
            return dist < this.maxDistance;
        });
        // Draw status text
        mp.game.graphics.drawText(`Vehicle Bone Debug (F7 to toggle) | Vehicles: ${nearbyVehicles.length}`, [0.5, 0.02], {
            font: 4,
            color: [255, 255, 100, 255],
            scale: [0.4, 0.4],
            outline: true,
            centre: true
        });
        // Visualize bones for each nearby vehicle
        for (const vehicle of nearbyVehicles) {
            this.visualizeVehicleBones(vehicle);
        }
    }
    visualizeVehicleBones(vehicle) {
        let foundBonesCount = 0;
        for (const boneName of this.allBones) {
            const boneIndex = vehicle.getBoneIndexByName(boneName);
            if (boneIndex === -1)
                continue;
            foundBonesCount++;
            const bonePos = mp.game.entity.getWorldPositionOfBone(vehicle.handle, boneIndex);
            // Get color based on bone type
            const color = this.getBoneColor(boneName);
            // Draw marker at bone position
            mp.game.graphics.drawMarker(28, // Sphere marker
            bonePos.x, bonePos.y, bonePos.z, 0, 0, 0, 0, 0, 0, 0.08, 0.08, 0.08, // Size
            color[0], color[1], color[2], color[3], false, false, 2, false, null, null, false);
            // Draw bone name label
            const screenCoords = mp.game.graphics.world3dToScreen2d(bonePos);
            if (screenCoords && screenCoords.x && screenCoords.y) {
                mp.game.graphics.drawText(`${boneName}\n[${boneIndex}]`, [screenCoords.x, screenCoords.y], {
                    font: 4,
                    color: [255, 255, 255, 200],
                    scale: [0.25, 0.25],
                    outline: true,
                    centre: true
                });
            }
        }
        // Draw vehicle info
        const vehiclePos = vehicle.position;
        const screenCoords = mp.game.graphics.world3dToScreen2d(vehiclePos);
        if (screenCoords && screenCoords.x && screenCoords.y) {
            mp.game.graphics.drawText(`Vehicle: ${vehicle.model}\nBones Found: ${foundBonesCount}`, [screenCoords.x, screenCoords.y - 0.1], {
                font: 4,
                color: [100, 255, 100, 255],
                scale: [0.35, 0.35],
                outline: true,
                centre: true
            });
        }
    }
    getBoneColor(boneName) {
        // Color code bones by category
        if (boneName.startsWith('door_') || boneName.startsWith('handle_')) {
            return [255, 100, 100, 200]; // Red - Doors/Handles
        }
        else if (boneName.startsWith('wheel_') || boneName.startsWith('suspension_') ||
            boneName.startsWith('hub_') || boneName.startsWith('spring_')) {
            return [100, 255, 100, 200]; // Green - Wheels/Suspension
        }
        else if (boneName.startsWith('window_') || boneName.startsWith('windscreen')) {
            return [100, 200, 255, 200]; // Light Blue - Windows
        }
        else if (boneName.startsWith('headlight_') || boneName.startsWith('taillight_') ||
            boneName.startsWith('brakelight_') || boneName.startsWith('indicator_')) {
            return [255, 255, 100, 200]; // Yellow - Lights
        }
        else if (boneName.startsWith('seat_')) {
            return [255, 150, 255, 200]; // Pink - Seats
        }
        else if (boneName.startsWith('exhaust')) {
            return [150, 150, 150, 200]; // Gray - Exhaust
        }
        else if (boneName === 'engine' || boneName.startsWith('engine_') ||
            boneName.startsWith('transmission_')) {
            return [255, 100, 0, 200]; // Orange - Engine/Transmission
        }
        else if (boneName === 'bonnet' || boneName === 'boot') {
            return [200, 100, 255, 200]; // Purple - Hood/Trunk
        }
        else if (boneName.startsWith('chassis') || boneName === 'bodyshell') {
            return [100, 100, 255, 200]; // Blue - Chassis
        }
        else {
            return [255, 255, 255, 200]; // White - Other
        }
    }
}
const vehicleBoneDebugVisualizer = new VehicleBoneDebugVisualizer();
// ============ VEHICLE INTERACTION SYSTEM ============
class VehicleInteractionSystem {
    constructor() {
        this.currentVehicle = null;
        this.currentBone = null;
        this.interactionKey = 0x45;
        this.debugToggleKey = 0x75; // F6 key
        this.raycastDistance = 15.0; // Increased for far third-person camera mode
        this.debugMode = false; // Toggleable with F6
    }
    init() {
        mp.events.add('render', this.onRender.bind(this));
        mp.keys.bind(this.interactionKey, true, this.onInteract.bind(this));
        mp.keys.bind(this.debugToggleKey, true, this.toggleDebug.bind(this));
        mp.console.logInfo('Vehicle interaction system initialized (F6 to toggle debug)');
    }
    toggleDebug() {
        this.debugMode = !this.debugMode;
        mp.gui.chat.push(this.debugMode ?
            '~g~Interaction Debug: ENABLED' :
            '~r~Interaction Debug: DISABLED');
    }
    drawDebugVisuals(raycast, distance) {
        if (!this.debugMode)
            return;
        const player = mp.players.local;
        if (!player || !player.handle)
            return;
        // Draw raycast line - MUST match the actual raycast function
        const startPos = mp.game.cam.getGameplayCoord();
        const camRot = mp.game.cam.getGameplayCamRot(2);
        const rotZ = camRot.z * (Math.PI / 180);
        const rotX = camRot.x * (Math.PI / 180);
        const dirX = -Math.sin(rotZ) * Math.cos(rotX);
        const dirY = Math.cos(rotZ) * Math.cos(rotX);
        const dirZ = Math.sin(rotX);
        const endPos = new mp.Vector3(startPos.x + dirX * distance, startPos.y + dirY * distance, startPos.z + dirZ * distance);
        // Calculate distance from player to hit point
        const playerPos = player.position;
        let hitDistance = 0;
        if (raycast && raycast.position) {
            hitDistance = mp.game.system.vdist(playerPos.x, playerPos.y, playerPos.z, raycast.position.x, raycast.position.y, raycast.position.z);
        }
        // Draw debug info at top of screen
        const debugInfo = raycast ?
            `Interaction Debug (F6) | HIT | Distance: ${hitDistance.toFixed(2)}m | Raycast: ${distance.toFixed(1)}m` :
            `Interaction Debug (F6) | MISS | Raycast: ${distance.toFixed(1)}m`;
        mp.game.graphics.drawText(debugInfo, [0.5, 0.02], {
            font: 4,
            color: raycast ? [100, 255, 100, 255] : [255, 100, 100, 255],
            scale: [0.35, 0.35],
            outline: true,
            centre: true
        });
        // Draw line: Green if hit, Red if miss
        const hitColor = raycast ? [0, 255, 0, 200] : [255, 0, 0, 200];
        mp.game.graphics.drawLine(startPos.x, startPos.y, startPos.z, endPos.x, endPos.y, endPos.z, hitColor[0], hitColor[1], hitColor[2], hitColor[3]);
        // If we hit a vehicle, draw bone positions
        if (raycast && raycast.entity.type === 'vehicle') {
            const vehicle = raycast.entity;
            const bones = [
                'door_dside_f',
                'door_pside_f',
                'door_dside_r',
                'door_pside_r',
                'bonnet',
                'boot'
            ];
            for (const boneName of bones) {
                const boneIndex = vehicle.getBoneIndexByName(boneName);
                if (boneIndex === -1)
                    continue;
                const handlePos = getBoneHandlePosition(vehicle, boneName);
                const boneDistance = mp.game.system.vdist(playerPos.x, playerPos.y, playerPos.z, handlePos.x, handlePos.y, handlePos.z);
                // Color based on whether this bone is the current target
                let color;
                if (this.currentBone === boneName) {
                    color = [255, 255, 0, 255]; // Yellow for targeted bone
                }
                else if (boneDistance < 2.0) {
                    color = [0, 255, 255, 200]; // Cyan for nearby bones
                }
                else {
                    color = [255, 255, 255, 150]; // White for far bones
                }
                // Draw a small sphere at the bone position
                mp.game.graphics.drawMarker(28, // Sphere marker
                handlePos.x, handlePos.y, handlePos.z, 0, 0, 0, 0, 0, 0, 0.1, 0.1, 0.1, // Size
                color[0], color[1], color[2], color[3], false, false, 2, false, null, null, false);
            }
            // Draw a larger sphere at the raycast hit point
            if (raycast.position) {
                mp.game.graphics.drawMarker(28, // Sphere marker
                raycast.position.x, raycast.position.y, raycast.position.z, 0, 0, 0, 0, 0, 0, 0.05, 0.05, 0.05, // Smaller size
                255, 0, 0, 255, // Red
                false, false, 2, false, null, null, false);
                // Draw distance label at hit point
                const screenCoords = mp.game.graphics.world3dToScreen2d(raycast.position);
                if (screenCoords && screenCoords.x && screenCoords.y) {
                    mp.game.graphics.drawText(`${hitDistance.toFixed(2)}m`, [screenCoords.x, screenCoords.y - 0.03], {
                        font: 4,
                        color: [255, 255, 100, 255],
                        scale: [0.4, 0.4],
                        outline: true,
                        centre: true
                    });
                }
            }
        }
    }
    onRender() {
        const player = mp.players.local;
        if (!player || !player.handle)
            return;
        // Calculate dynamic raycast distance based on camera distance
        const cameraPos = mp.game.cam.getGameplayCoord();
        const playerPos = player.position;
        const camToPlayerDist = mp.game.system.vdist(cameraPos.x, cameraPos.y, cameraPos.z, playerPos.x, playerPos.y, playerPos.z);
        // Dynamic raycast distance: camera distance + base interaction range
        // Close camera (~0-2m): 2-4m raycast
        // Far camera (~6-8m): 8-10m raycast
        const baseInteractionRange = 2.0;
        const dynamicRaycastDistance = camToPlayerDist + baseInteractionRange;
        const raycast = raycastFromCamera(dynamicRaycastDistance);
        // Draw debug visuals
        this.drawDebugVisuals(raycast, dynamicRaycastDistance);
        if (!raycast) {
            this.clearInteraction();
            interactionHUD.draw(); // Draw labels even when not targeting
            return;
        }
        if (raycast.entity.type !== 'vehicle') {
            this.clearInteraction();
            interactionHUD.draw(); // Draw labels even when not targeting
            return;
        }
        // mp.console.logInfo(`[Interaction] Vehicle detected, boneIndex: ${raycast.boneIndex}`);
        if (raycast.boneIndex === -1) {
            // mp.console.logInfo('[Interaction] No valid bone found on vehicle');
            this.clearInteraction();
            interactionHUD.draw(); // Draw labels even when not targeting
            return;
        }
        const vehicle = raycast.entity;
        const boneName = getBoneName(vehicle, raycast.boneIndex);
        if (!boneName) {
            this.clearInteraction();
            interactionHUD.draw(); // Draw labels even when not targeting
            return;
        }
        this.currentVehicle = vehicle;
        this.currentBone = boneName;
        const state = this.getVehiclePartState(vehicle, boneName);
        // Use the raycast hit position for accurate label placement
        const handlePos = raycast.position;
        // Set the targeted bone for the HUD
        interactionHUD.setTarget(vehicle, boneName, handlePos, state);
        // Draw all labels including the targeted one
        interactionHUD.draw();
    }
    clearInteraction() {
        if (this.currentVehicle || this.currentBone) {
            this.currentVehicle = null;
            this.currentBone = null;
            interactionHUD.setTarget(null, null, null, false);
        }
    }
    onInteract() {
        if (!this.currentVehicle || !this.currentBone) {
            return;
        }
        mp.events.callRemote('vehicleInteraction:interact', this.currentVehicle.remoteId, this.currentBone);
        mp.console.logInfo(`Interacting with ${this.currentBone} on vehicle ${this.currentVehicle.remoteId}`);
    }
    getVehiclePartState(vehicle, boneName) {
        const doorMap = {
            'door_dside_f': 0,
            'door_pside_f': 1,
            'door_dside_r': 2,
            'door_pside_r': 3,
            'bonnet': 4,
            'boot': 5
        };
        const doorIndex = doorMap[boneName];
        if (doorIndex === undefined) {
            return false;
        }
        const angle = vehicle.getDoorAngleRatio(doorIndex);
        return angle > 0.1;
    }
}
const vehicleInteractionSystem = new VehicleInteractionSystem();
// ============ DOOR TOGGLE HANDLER ============
mp.events.add('vehicleInteraction:toggleDoor', (vehicleRemoteId, doorIndex) => {
    const vehicles = mp.vehicles.toArray();
    const vehicle = vehicles.find(v => v.remoteId === vehicleRemoteId);
    if (!vehicle) {
        mp.gui.chat.push(`Vehicle ${vehicleRemoteId} not found`);
        return;
    }
    const currentAngle = vehicle.getDoorAngleRatio(doorIndex);
    const isOpen = currentAngle > 0.1;
    if (isOpen) {
        vehicle.setDoorShut(doorIndex, false);
    }
    else {
        vehicle.setDoorOpen(doorIndex, false, false);
    }
});
// ============ WAYPOINT TELEPORT HANDLER ============
/**
 * Handle waypoint teleport request from server
 */
mp.events.add('teleportToWaypoint', () => {
    const waypoint = mp.game.ui.getFirstBlipInfoId(8); // 8 = waypoint blip
    if (!mp.game.ui.doesBlipExist(waypoint)) {
        mp.gui.chat.push('!{FF0000}No waypoint set on the map!');
        return;
    }
    const coords = mp.game.ui.getBlipInfoIdCoord(waypoint);
    // Use waypoint Z coordinate (will snap to ground on server side if needed)
    const groundZ = coords.z;
    // Request server to teleport player
    mp.events.callRemote('teleportPlayer', coords.x, coords.y, groundZ);
    mp.gui.chat.push('!{00FF00}Teleporting to waypoint...');
});
// ============ INITIALIZATION ============
vehicleInteractionSystem.init();
vehicleBoneDebugVisualizer.init();
mp.gui.chat.push('Client loaded - Vehicle interaction system active!');
