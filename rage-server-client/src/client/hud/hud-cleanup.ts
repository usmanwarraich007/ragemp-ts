/**
 * hud-cleanup.ts
 *
 * Hides native GTA HUD components that we replace with custom CEF equivalents.
 * Must be called every render frame — GTA re-enables them each frame.
 *
 * Component IDs reference:
 *   https://wiki.rage.mp/index.php?title=HudComponent
 *   1  = HEALTH_ARMOUR     (green/blue bars under minimap)
 *   2  = WEAPON_ICON
 *   3  = CASH
 *   6  = VEHICLE_NAME
 *   7  = AREA_NAME         (shown top-left in vanilla)
 *   8  = VEHICLE_CLASS
 *   9  = STREET_NAME       (shown top-left in vanilla)
 *  19  = WEAPON_WHEEL
 *  20  = WEAPON_WHEEL_STATS
 *  22  = MAX_HUD_WEAPONS (ammo counter)
 */
mp.events.add('render', () => {
  // Health/Armor bars below the minimap
  mp.game.ui.hideHudComponentThisFrame(1);

  // Text overlays we replace with CEF
  mp.game.ui.hideHudComponentThisFrame(7);  // area name
  mp.game.ui.hideHudComponentThisFrame(9);  // street name

  // Vehicle clutter we don't need
  mp.game.ui.hideHudComponentThisFrame(6);  // vehicle name
  mp.game.ui.hideHudComponentThisFrame(8);  // vehicle class

  // Cash — we have our own money display
  mp.game.ui.hideHudComponentThisFrame(3);

  // Weapon wheel info (we use custom inventory)
  mp.game.ui.hideHudComponentThisFrame(19);
  mp.game.ui.hideHudComponentThisFrame(20);
  mp.game.ui.hideHudComponentThisFrame(22);
});
