import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import arraybuffer from "vite-plugin-arraybuffer";

// import vueDevTools from "vite-plugin-vue-devtools";

export default defineConfig({
  plugins: [
    arraybuffer(),
    tailwindcss(),
    vue(),
    // vueDevTools()
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
