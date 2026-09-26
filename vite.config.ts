import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// 大屏渲染端（主窗口）构建：仅 index.html 入口，产物输出到 dist/
export default defineConfig({
  plugins: [vue()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    target: "es2021",
    rollupOptions: {
      input: "index.html",
    },
  },
});
