/**
 * admin/freeze.ts — Client-side player freeze.
 * Activated by /freeze [id] → server sends admin:freezeToggle.
 */

let isFrozen = false;

mp.events.add('admin:freezeToggle', () => {
  isFrozen = !isFrozen;
  mp.players.local.freezePosition(isFrozen);
  mp.game.ui.displayHelpTextThisFrame(isFrozen ? 'You are ~r~frozen' : 'You are ~g~unfrozen', false);
});

export {};
