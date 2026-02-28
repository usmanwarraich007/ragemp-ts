import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { rageBridge } from './core';

// Base styles — transparent background, no scrollbars
import './assets/base.css';

// Font Awesome — used by stat-rings HUD
import '@fortawesome/fontawesome-free/css/all.min.css';

// Initialize the RAGE:MP bridge BEFORE mounting Vue.
// This sets up window.mp mock in dev and registers the inbound event listener.
rageBridge.init();

const app = createApp(App);
app.use(createPinia());
app.mount('#app');
