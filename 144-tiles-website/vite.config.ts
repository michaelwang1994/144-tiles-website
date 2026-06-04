import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  server: { open: true },
  base: "/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        board: resolve(__dirname, "board_index.html"),
      },
    },
  },
});
