import { defineConfig } from "vite";
import { resolve } from "path";
import fs from "fs";

function pointsRoutePlugin() {
  return {
    name: "points-route",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === "/points" || req.url === "/points/") {
          req.url = "/points-calculator.html";
        }
        next();
      });
    },
    closeBundle() {
      const src = resolve(__dirname, "dist/points-calculator.html");
      const destDir = resolve(__dirname, "dist/points");
      const dest = resolve(destDir, "index.html");
      if (fs.existsSync(src)) {
        fs.mkdirSync(destDir, { recursive: true });
        fs.renameSync(src, dest);
      }
    },
  };
}

export default defineConfig({
  plugins: [pointsRoutePlugin()],
  server: { open: true },
  base: "/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        board: resolve(__dirname, "board_index.html"),
        points: resolve(__dirname, "points-calculator.html"),
      },
    },
  },
});
