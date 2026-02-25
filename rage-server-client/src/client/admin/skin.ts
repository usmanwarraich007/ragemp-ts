/**
 * admin/skin.ts — Runtime ped model change.
 *
 * Activated by /skin [model] → server sends admin:setSkin.
 */

mp.events.add('admin:setSkin', (model: string) => {
  const hash = mp.game.joaat(model);
  mp.game.streaming.requestModel(hash);
  const waitForLoad = setInterval(() => {
    if (!mp.game.streaming.hasModelLoaded(hash)) return;
    clearInterval(waitForLoad);
    mp.players.local.model = hash;
    mp.game.streaming.setModelAsNoLongerNeeded(hash);
  }, 100);
});
