import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import { setupLayouts } from 'virtual:generated-layouts';
import Vuetify from './plugins/vuetify';
import App from './App.vue';
import store from './store';
import routes from './routes';

import 'vuetify/dist/vuetify.min.css';

const app = createApp(App);
const router = createRouter({
  history: createWebHashHistory(),
  routes: setupLayouts(routes)
});

app.use(Vuetify);
app.use(store);
app.use(router);

app.mount('#app');
