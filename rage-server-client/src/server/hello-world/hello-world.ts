/**
 * hello-world — minimal "server is alive" smoke check.
 * Remove or replace this with a real feature.
 */
mp.events.add('playerReady', (player: PlayerMp) => {
  player.outputChatBox('Hello World! - server');
});
