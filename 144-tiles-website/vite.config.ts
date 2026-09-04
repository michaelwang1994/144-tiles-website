import { defineConfig } from "vite";
import { resolve } from "path";
import fs from "fs";

function pageRoutePlugin(route, htmlFile) {
  return {
    name: `${route}-route`,
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === `/${route}` || req.url === `/${route}/`) {
          req.url = `/${htmlFile}`;
        }
        next();
      });
    },
    closeBundle() {
      const src = resolve(__dirname, `dist/${htmlFile}`);
      const destDir = resolve(__dirname, `dist/${route}`);
      const dest = resolve(destDir, "index.html");
      if (fs.existsSync(src)) {
        fs.mkdirSync(destDir, { recursive: true });
        fs.renameSync(src, dest);
      }
    },
  };
}

export default defineConfig({
  plugins: [pageRoutePlugin("points", "points-calculator.html"), pageRoutePlugin("gathering", "gathering.html")],
  server: { open: true },
  base: "/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        board: resolve(__dirname, "board_index.html"),
        points: resolve(__dirname, "points-calculator.html"),
        gathering: resolve(__dirname, "gathering.html"),
      },
    },
  },
});
