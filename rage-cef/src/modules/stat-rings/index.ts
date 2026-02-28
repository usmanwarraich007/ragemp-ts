import { createModule } from '@/core';
import StatRings from './StatRings.vue';

// stat-rings is mounted as a persistent HUD overlay (not a page-routed module),
// but registering it here ensures the store gets initialised when the component mounts.
createModule('stat-rings', StatRings);
