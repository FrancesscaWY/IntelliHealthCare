import path from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const backendTarget = process.env.IHC_BACKEND_TARGET || "http://server.mctown.online:8190";
const buildBase = process.env.IHC_ASSET_BASE?.trim() || "/";
const buildOutDir = process.env.IHC_USER_WEB_OUT_DIR?.trim()
  ? path.resolve(process.env.IHC_USER_WEB_OUT_DIR)
  : path.resolve(__dirname, "../../dist/user-web");

export default defineConfig({
  base: buildBase,
  plugins: [vue()],
  optimizeDeps: {
    entries: ["index.html"],
    include: ["@rive-app/canvas"]
  },
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
    outDir: buildOutDir,
    emptyOutDir: true,
  },
});
