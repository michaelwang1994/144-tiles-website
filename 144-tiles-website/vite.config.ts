import { defineConfig } from "vite";

export default defineConfig({
  server: { open: true },
  base: process.env.GITHUB_REPOSITORY
    ? `/${process.env.GITHUB_REPOSITORY.split("/")[1]}/`
    : "/",
});
