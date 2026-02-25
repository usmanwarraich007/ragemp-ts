/**
 * admin/god.ts — God mode.
 * Toggle with /god → server sends admin:godToggle.
 */

let godEnabled = false;

mp.events.add('render', () => {
  if (!godEnabled) return;
  const p = mp.players.local;
  if (p.getHealth() < 200) p.setHealth(200);
  if (p.getArmour() < 100) p.setArmour(100);
});

mp.events.add('admin:godToggle', () => {
  godEnabled = !godEnabled;
  mp.game.ui.displayHelpTextThisFrame(godEnabled ? 'God Mode ~g~ON' : 'God Mode ~r~OFF', false);
});

export {};
