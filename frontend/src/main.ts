import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./styles.css";
import FloatingVue from "floating-vue";

const app = createApp(App);

app.use(router);
app.use(FloatingVue, {
  themes: {
    tooltip: {
      delay: {
        show: 50,
        // hide: 1000000, // debug
      },
    },
  },
});

app.mount("#app");
