import path from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const backendTarget = "http://server.mctown.online:8190";

export default defineConfig({
  base: "./",
  plugins: [vue()],
  server: {
    proxy: {
      "/api/v1": {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "../../dist/user-web"),
    emptyOutDir: true,
  },
});
