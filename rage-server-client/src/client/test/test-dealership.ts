/**
 * test-dealership.ts — Quick in-game test for the MarkerSystem + registry.
 * Remove or comment this import in index.ts when no longer needed.
 */

import { registry, markerSystem } from '../interaction';

const DEALERSHIP_POS = new mp.Vector3(-30.0076, -1105.1147, 26.4223);
const ID = 'dealership-southls-01';

// ── World marker (visible from far away) ─────────────────────────────────────
markerSystem.register({
  id:            ID,
  type:          27,                       // blue rotating arrows circle
  position:      DEALERSHIP_POS,
  color:         [80, 200, 255, 160],
  scale:         1.0,
  visibleRadius: 60,
  rotate:        true,
  bobUpDown:     false,
  heightOffset:  -0.5,                    // sink slightly into the ground
});

// ── Interaction (menu appears when standing inside marker) ───────────────────
registry.register({
  id:             ID,
  label:          'Vehicle Dealership',
  subtitle:       '',
  labelRadius:    5.0,                    // label visible 5 m out
  interactRadius: 2.0,                    // menu only when inside the marker
  snapRadius:     2.0,                    // wide snap — no precise aim needed
  canInteract:    () => !mp.players.local.vehicle || 'Exit the vehicle first.',
  getPosition:    () => DEALERSHIP_POS,
  menuTitle:      '',
  items: [
    { label: 'Browse Vehicles', action: 'browse'  },
    { label: 'Test Drive',      action: 'test'    },
    { label: 'Sell Vehicle',    action: 'sell'    },
  ],
  onSelect(action: string): void {
    switch (action) {
      case 'browse': mp.gui.chat.push('!{44AAFF}[Dealership] Browse — not yet implemented.'); break;
      case 'test':   mp.gui.chat.push('!{44AAFF}[Dealership] Test Drive — not yet implemented.'); break;
      case 'sell':   mp.gui.chat.push('!{44AAFF}[Dealership] Sell — not yet implemented.');   break;
    }
  },
});
