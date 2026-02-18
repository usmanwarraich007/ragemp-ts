import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ProgressBarView from './views/ProgressBarView.vue';

const app = createApp(ProgressBarView);

app.use(createPinia());

app.mount('#app');
