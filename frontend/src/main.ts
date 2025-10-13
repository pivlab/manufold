import "./styles.css";
import { createApp } from "vue";
import FloatingVue from "floating-vue";
import App from "./App.vue";
import router from "./router";

const app = createApp(App);

app.use(router);
app.use(FloatingVue, {
  themes: {
    tooltip: {
      overflowPadding: 10,
      delay: {
        show: 50,
        // hide: 1000000, // debug
      },
    },
    dropdown: {
      overflowPadding: 10,
      delay: {
        // hide: 1000000, // debug
      },
    },
  },
});

app.mount("#app");
