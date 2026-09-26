import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// 手机控制端构建：仅 control.html 入口，产物输出到 dist-control/，
// 由 Rust 侧 axum 服务挂载在 /c/ 路径下分发，base 使用相对路径以适配挂载前缀。
export default defineConfig({
  plugins: [vue()],
  base: "./",
  publicDir: "public-control",
  build: {
    outDir: "dist-control",
    target: "es2021",
    rollupOptions: {
      input: "control.html",
    },
  },
});
