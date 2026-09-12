import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 配信先は WebView2 だけなので、トランスパイル対象を絞って出力を小さくする
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "chrome120",
    sourcemap: false,
  },
  server: { port: 5173, strictPort: true },
  clearScreen: false,
});
