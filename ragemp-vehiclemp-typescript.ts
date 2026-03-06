declare interface VehicleMp extends EntityMp {
	readonly controller: PlayerMp;
	gear: number;
	rpm: number;
	steeringAngle: number;

	addUpsidedownCheck(): void;
	areAllWindowsIntact(): boolean;
	attachToCargobob(cargobob: Handle, boneIndex: number, x: number, y: number, z: number): void;
	attachToTowTruck(vehicle: Handle, rear: boolean, hookOffsetX: number, hookOffsetY: number, hookOffsetZ: number): void;
	attachToTrailer(trailer: Handle, radius: number): void;
	canShuffleSeat(seatIndex: number): boolean;
	cargobobMagnetGrab(toggle: boolean): void;
	clearCustomPrimaryColour(): void;
	clearCustomSecondaryColour(): void;
	closeBombBayDoors(): void;
	detachFromAnyCargobob(): boolean;
	detachFromAnyTowTruck(): boolean;
	detachFromCargobob(cargobob: Handle): void;
	detachFromTowTruck(vehicle: Handle): void;
	detachFromTrailer(): void;
	detachWindscreen(): void;
	disableImpactExplosionActivation(toggle: boolean): void;
	disablePlaneAileron(leftSide: boolean, disable: boolean): void;
	doesExtraExist(extraId: number): boolean;
	doesHaveRoof(): boolean;
	doesHaveStuckVehicleCheck(): boolean;
	doesHaveWeapon(): boolean;
	ejectJb700Roof(x: number, y: number, z: number): void;
	enableCargobobHook(state: number): void;
	explode(isAudible: boolean, isInvisble: boolean): void;
	explodeInCutscene(explosion: boolean): void;
	fixWindow(index: number): void;
	getAcceleration(): number;
	getAttachedToCargobob(): Handle;
	getAttachedToTowTruck(): Handle;
	getBoatAnchor(): boolean;
	getBodyHealth(): number;
	getBodyHealth2(): number;
	getCargobobHookPosition(): Vector3;
	getCauseOfDestruction(): Hash;
	getClass(): number;
	getColor(
		r: number,
		g: number,
		b: number
	): {
		r: number;
		g: number;
		b: number;
	};
	getColourCombination(): number;
	getColours(
		colorPrimary: number,
		colorSecondary: number
	): {
		colorPrimary: number;
		colorSecondary: number;
	};
	getConvertibleRoofState(): number;
	getCustomPrimaryColour(
		r: number,
		g: number,
		b: number
	): {
		r: number;
		g: number;
		b: number;
	};
	getCustomSecondaryColour(
		r: number,
		g: number,
		b: number
	): {
		r: number;
		g: number;
		b: number;
	};
	getDeformationAtPos(offsetX: number, offsetY: number, offsetZ: number): Vector3;
	getDirtLevel(): number;
	getDoorAngleRatio(door: number): number;
	getDoorLockStatus(): number;
	getDoorsLockedForPlayer(player: Handle): boolean;
	getEngineHealth(): number;
	getExtraColours(
		pearlescentColor: number,
		wheelColor: number
	): {
		pearlescentColor: number;
		wheelColor: number;
	};
	getHandling(typeName: string): number | string;
	getDefaultHandling(typeName: string): number | string;
	getHeliEngineHealth(): number;
	getHeliMainRotorHealth(): number;
	getHeliTailRotorHealth(): number;
	getIsEngineRunning(): number;
	getIsLeftHeadlightDamaged(): boolean;
	getIsPrimaryColourCustom(): boolean;
	getIsRightHeadlightDamaged(): boolean;
	getIsSecondaryColourCustom(): boolean;
	getLandingGearState(): number;
	getLastPedInSeat(seatIndex: number): Handle;
	getLayoutHash(): Hash;
	getLightsState(
		lightsOn: number,
		highbeamsOn: number
	): {
		lightsOn: boolean;
		highbeamsOn: boolean;
	};
	getLivery(): number;
	getLiveryCount(): number;
	getLiveryName(liveryIndex: number): string;
	getMaxBreaking(): number;
	getMaxNumberOfPassengers(): number;
	getMaxTraction(): number;
	getMod(modType: number): number;
	getModColor1(
		paintType: number,
		color: number,
		p2: number
	): {
		paintType: number;
		color: number;
		p2: number;
	};
	getModColor1TextLabel(p0: boolean): string;
	getModColor2(
		paintType: number,
		color: number
	): {
		paintType: number;
		color: number;
		p2: number;
	};
	getModColor2TextLabel(): string;
	getModKit(): number;
	getModKitType(): number;
	getModModifierValue(modType: number, modIndex: number): any; // TODO
	getModSlotName(modType: number): string;
	getModTextLabel(modType: number, modValue: number): string;
	getModVariation(modType: number): boolean;
	getNeonLightsColour(
		r: number,
		g: number,
		b: number
	): {
		r: number;
		g: number;
		b: number;
	};
	getNumberOfColours(): number;
	getNumberOfPassengers(): number;
	getNumberPlateText(): string;
	getNumberPlateTextIndex(): number;
	getNumModKits(): number;
	getNumMods(modType: number): number;
	getOwner(entity: Handle): boolean;
	getPaintFade(): number;
	getPedInSeat(index: number): Handle;
	getPedUsingDoor(doorIndex: number): Handle;
	getPetrolTankHealth(): number;
	getPlateType(): number;
	getSuspensionHeight(): number;
	getTrailer(vehicle: Handle): Handle;
	getTrainCarriage(cariage: number): Handle;
	getTyresCanBurst(): boolean;
	getTyreSmokeColor(
		r: number,
		g: number,
		b: number
	): {
		r: number;
		g: number;
		b: number;
	};
	getVehicleTrailer(vehicle: Handle): Handle;
	getWheelType(): number;
	getWindowTint(): number;
	isAConvertible(checkRoofExtras: boolean): boolean;
	isAlarmActivated(): boolean;
	isAnySeatEmpty(): boolean;
	isAttachedToCargobob(vehicleAttached: Handle): boolean;
	isAttachedToTowTruck(vehicle: Handle): boolean;
	isAttachedToTrailer(): boolean;
	isBig(): boolean;
	isBumperBrokenOff(front: boolean): boolean;
	isCargobobHookActive(): boolean;
	isCargobobMagnetActive(): boolean;
	isDamaged(): boolean;
	isDoorDamaged(doorId: number): boolean;
	isDriveable(checkfire: boolean): boolean;
	isExtraTurnedOn(extraId: number): boolean;
	isHeliPartBroken(mainRotor: boolean, rearRotor: boolean, tailBoom: boolean): boolean;
	isHighDetail(): boolean;
	isInBurnout(): boolean;
	isModel(model: Hash): boolean;
	isNeonLightEnabled(index: number): boolean;
	isOnAllWheels(): boolean;
	isSearchlightOn(): boolean;
	isSeatFree(seatIndex: number): boolean;
	isSirenOn(): boolean;
	isSirenSoundOn(): boolean;
	isStolen(): boolean;
	isStopped(): boolean;
	isStoppedAtTrafficLights(): boolean;
	isStuckOnRoof(): boolean;
	isStuckTimerUp(type: RageEnums.Vehicle.vStuckType | number, requiredTime: number): boolean;
	isTaxiLightOn(): boolean;
	isToggleModOn(modType: number): boolean;
	isTyreBurst(wheelId: number, completely: boolean): boolean;
	isVisible(): boolean;
	isWindowIntact(windowIndex: number): boolean;
	jitter(p0: boolean, yaw: number, pitch: number, roll: number): void;
	lowerConvertibleRoof(instantlyLower: boolean): void;
	movable(): boolean;
	openBombBayDoors(): void;
	raiseConvertibleRoof(instantlyRaise: boolean): void;
	releasePreloadMods(): void;
	removeHighDetailModel(): void;
	removeMod(modType: number): void;
	removeUpsidedownCheck(): void;
	removeWindow(windowIndex: number): void;
	requestHighDetailModel(): void;
	resetStuckTimer(reset: boolean): void;
	resetWheels(toggle: boolean): void;
	retractCargobobHook(): void;
	rollDownWindow(windowIndex: number): void;
	rollDownWindows(): void;
	rollUpWindow(windowIndex: number): void;
	setAlarm(state: boolean): void;
	setAllowNoPassengersLockon(toggle: boolean): void;
	setAllsSpawns(p0: boolean, p1: boolean, p2: boolean): void;
	setAutomaticallyAttaches(autoAttach: boolean, scanDriver: boolean): void;
	setBikeLeanAngle(x: number, y: number): void;
	setBoatAnchor(toggle: boolean): void;
	setBodyHealth(value: number): void;
	setBrakeLights(toggle: boolean): void;
	setBurnout(toggle: boolean): void;
	setCanBeTargetted(state: boolean): void;
	setCanBeUsedByFleeingPeds(toggle: boolean): void;
	setCanBeVisiblyDamaged(state: boolean): void;
	setCanBreak(toggle: boolean): void;
	setCanRespray(state: boolean): void;
	setCeilingHeight(height: number): void;
	setColourCombination(numCombos: number): void;
	setColours(colorPrimary: number, colorSecondary: number): void;
	setConvertibleRoof(animated: boolean): void;
	setCreatesMoneyPickupsWhenExploded(toggle: boolean): void;
	setCustomPrimaryColour(r: number, g: number, b: number): void;
	setCustomSecondaryColour(r: number, g: number, b: number): void;
	setDamage(xOffset: number, yOffset: number, zOffset: number, damage: number, radius: number, focusOnModel: boolean): void;
	setDeformationFixed(): void;
	setDirtLevel(dirtLevel: number): void;
	setDisablePetrolTankDamage(toggle: boolean): void;
	setDisablePetrolTankFires(toggle: boolean): void;
	setDoorBreakable(doorIndex: number, isBreakable: boolean): void;
	setDoorBroken(doorIndex: number, createDoorObject: boolean): void;
	setDoorControl(doorIndex: number, speed: number, angle: number): void;
	setDoorLatched(doorIndex: number, toggle: boolean, autoLatch: boolean, applyForce: boolean): void;
	setDoorOpen(doorIndex: number, loose: boolean, openInstantly: boolean): void;
	setDoorShut(doorIndex: number, closeInstantly: boolean): void;
	setDoorsLocked(doorLockStatus: number): void;
	setDoorsLockedForAllPlayers(toggle: boolean): void;
	setDoorsLockedForPlayer(player: Handle, toggle: boolean): void;
	setDoorsLockedForTeam(team: number, toggle: boolean): void;
	setDoorsShut(closeInstantly: boolean): void;
	setDriftTyresEnabled(toggle: boolean): void;
	getDriftTyresEnabled(): boolean;
	setEngineCanDegrade(toggle: boolean): void;
	setEngineHealth(health: number): void;
	setEngineOn(value: boolean, instantly: boolean, otherwise: boolean): void;
	setEnginePowerMultiplier(value: number): void;
	setEngineTorqueMultiplier(value: number): void;
	setExclusiveDriver(ped: Handle, driverIndex: number): void;
	setExplodesOnHighExplosionDamage(toggle: boolean): void;
	setExtra(extraId: number, toggle: number): void;
	setExtraColours(pearlescentColor: number, wheelColor: number): void;
	setFixed(): void;
	setForwardSpeed(speed: number): void;
	setFrictionOverride(friction: number): void;
	setFullbeam(toggle: boolean): void;
	setGravity(toggle: boolean): void;
	setHalt(distance: number, killEngine: number, unknown: boolean): void;
	setHandbrake(toggle: boolean): void;
	setHandling(typeName: string, value: number | string): void;
	resetHandling(): void;
	setHasBeenOwnedByPlayer(owned: boolean): void;
	setHasStrongAxles(toggle: boolean): void;
	setHeliBladesFullSpeed(): void;
	setHeliBladeSpeed(speed: number): void;
	setHelicopterRollPitchYawMult(multiplier: number): void;
	setIndicatorLights(turnSignal: number, toggle: boolean): void;
	setInteriorLight(toggle: boolean): void;
	setIsConsideredByPlayer(toggle: boolean): void;
	setIsStolen(isStolen: boolean): void;
	setIsWanted(state: boolean): void;
	setJetEngineOn(toggle: boolean): void;
	setLandingGear(state: number): void;
	setLightMultiplier(multiplier: number): void;
	setLights(state: number | boolean): void;
	setLivery(livery: number): void;
	setLodMultiplier(multiplier: number): void;
	setMissionTrainCoords(x: number, y: number, z: number): void;
	setMod(modType: number, modIndex: number): void;
	setModColor1(paintType: number, color: number, specColIndex: number): void;
	setModColor2(paintType: number, color: number): void;
	setModKit(modKit: number): void;
	setNameDebug(name: string): void;
	setNeedsToBeHotwired(toggle: boolean): void;
	setNeonLightEnabled(index: number, toggle: boolean): void;
	setNeonLightsColour(r: number, g: number, b: number): void;
	setNumberPlateText(plateText: string): void;
	setNumberPlateTextIndex(plateIndex: number): void;
	setOnGroundProperly(): boolean;
	setOutOfControl(killDriver: boolean, explodeOnImpact: boolean): void;
	setPaintFade(fade: number): void;
	setPedEnabledBikeRingtone(p0: any): boolean;
	setPedTargettableDestory(vehicleComponent: number, destroyType: number): void;
	setPetrolTankHealth(fix: number): void;
	setPlaneMinHeightAboveGround(height: number): void;
	setPlaybackToUseAi(flag: number): void;
	setPlayersLast(): void;
	setProvidesCover(toggle: boolean): void;
	setReduceGrip(toggle: boolean): void;
	setRenderTrainAsDerailed(toggle: boolean): void;
	setRudderBroken(dissapear: boolean): void;
	setSearchlight(toggle: boolean, canBeUsedByAI: boolean): void;
	setSilent(toggle: boolean): void;
	setSiren(toggle: boolean): void;
	setSirenSound(toggle: boolean): void;
	setSteerBias(value: number): void;
	setStrong(toggle: boolean): void;
	setTaxiLights(state: boolean): void;
	setTimedExplosion(ped: Handle, toggle: boolean): void;
	setTowTruckCraneHeight(height: number): void;
	setTrainCruiseSpeed(speed: number): void;
	setTrainSpeed(speed: number): void;
	setTyreBurst(tyreIndex: number, instantBurst: boolean, damage: number): void;
	setTyreFixed(tyreIndex: number): void;
	setTyresCanBurst(toggle: boolean): void;
	setTyreSmokeColor(r: number, g: number, b: number): void;
	setUndriveable(toggle: boolean): void;
	setWheelsCanBreak(enabled: boolean): void;
	setWheelsCanBreakOffWhenBlowUp(toggle: boolean): void;
	setWheelType(wheelType: number): void;
	setWindowTint(tint: number): void;
	smashWindow(index: number): void;
	startAlarm(): void;
	startHorn(duration: number, model: Hash, forever: boolean): void;
	steerUnlockBias(toggle: boolean): void;
	toggleMod(modType: number, toggle: boolean): void;
	trackVisibility(): void;
	wasCounterActivated(p0: any): boolean;
	getHasKers(): boolean;
	setKersAllowed(enable: boolean): void;
	getNumberOfDoors(): number;
	blipSiren(): void;
	setVehHasRadioOverride(): void;
	isVehicleRadioEnabled(): boolean;
	setVehicleRadioLoud(toggle: boolean): void;
	isVehicleRadioLoud(): boolean;
	setVehicleRadioEnabled(enable: boolean): void;
	overrideVehHorn(override: boolean, hornHash: number): void;
	playStreamFromVehicle(): void;
	setSirenWithNoDriver(enable: boolean): void;
	setSirenKeepOn(enable: boolean): void;
	triggerSiren(): void;
	setVehiclePriority(p1: number): void;
	setPedTargettableDestroy(doorId: number, doorLockStatus: number): void;
	getEntityAttachedToTowTruck(towTruck: Handle): Handle;
	setHornPermanentlyOnTime(time: number): void;
	doesAllowRappel(): boolean;

	/**

	 * @returns boolean
	 */
	isPositionFrozen: boolean;

	/**
	 * @returns number
	 */
	wheelCount: number;

	gravity: number;
	nosActive: boolean;
	nosAmount: number;

	/**
	 * @params wheelId
	 * @returns number
	 */
	getWheelCamber(wheelId: number): number;

	/**

	 * @params wheelId - use 255 to apply all wheel
	 * @params value
	 *
	 * @returns void
	 */
	setWheelCamber(wheelId: number, value: number): void;

	/**

	 * @params wheelId - use 255 to apply all wheel
	 *
	 * @returns number
	 */
	getWheelTrackWidth(wheelId: number): number;

	/**

	* @params wheelId - use 255 to apply all wheel
	* @params value
	*
	* @returns void
	*/
	setWheelTrackWidth(wheelId: number, value: number): void;

	/**

	 * @params wheelId
	 *
	 * @returns number
	 */
	getWheelHeight(wheelId: number): number;

	/**

	 * @params wheelId - use 255 to apply all wheel
	 * @params value
	 *
	 * @returns void
	 */
	setWheelHeight(wheelId: number, value: number): void;

	/**

	 * @params wheelId
	 *
	 * @returns number
	 */
	getTyreWidth(wheelId: number): number;

	/**

	 * @params wheelId - use 255 to apply all wheel
	 * @params value
	 *
	 * @returns void
	 */
	setTyreWidth(wheelId: number, value: number): void;

	/**

	 * @params wheelId
	 *
	 * @returns number
	 */
	getTyreRadius(wheelId: number): number;

	/**

	 * @params wheelId - use 255 to apply all wheel
	 * @params value
	 *
	 * @returns void
	 */
	setTyreRadius(wheelId: number, value: number): void;

	/**

	 * @params wheelId
	 *
	 * @returns number
	 */
	getRimRadius(wheelId: number): number;

	/**

	 * @params wheelId - use 255 to apply all wheel
	 * @params value
	 *
	 * @returns void
	 */
	setRimRadius(wheelId: number, value: number): void;

	/**

	 *
	 * @returns number
	 */
	getWheelRadius(): number;

	/**

	 * @params value
	 *
	 * @returns void
	 */
	setWheelRadius(value: number): void;

	/**

	 *
	 * @returns number
	 */
	getWheelWidth(): number;

	/**

	 * @params value
	 *
	 * @returns void
	 */
	setWheelWidth(value: number): void;

	/**

	 * @params height
	 *
	 * @returns void
	 */
	setSuspensionHeight(height: number): void;

	/**
	 *
	 * Available on 11_test_1102_eXzHpHrWd2UfgUhdau6PDVJ88GG5aQY3 branch
	 */

	breakOffWheel(wheelId: number, deleteMapObject: boolean): void;
	fixWheel(wheelId: number): void;
	isWheelBrokenOff(wheelId: number): boolean;

	// Use vehicle.isBumperBrokenOff() to get current state
	breakOffBumper(front: boolean, deleteMapObject: boolean): void;
	fixBumper(front: boolean): void;

	// Forces remote vehicles broken wheels map object removal
	deleteBrokenWheelObjects: boolean;
	// Forces remote vehicles generic broken parts map object removal, i.e. parts not specified separately
	deleteBrokenPartObjects: boolean;
	// Forces remote vehicles broken vehicle door map object removal
	deleteBrokenDoorObjects: boolean;

	// experimental
	setTrailerAttachmentsUnbreakable(toggle: boolean): void;
}