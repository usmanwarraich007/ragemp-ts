import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { rageBridge } from './core';

// Base styles — transparent background, no scrollbars
import './assets/base.css';

// Initialize the RAGE:MP bridge BEFORE mounting Vue.
// This sets up window.mp mock in dev and registers the inbound event listener.
rageBridge.init();

const app = createApp(App);
app.use(createPinia());
app.mount('#app');
