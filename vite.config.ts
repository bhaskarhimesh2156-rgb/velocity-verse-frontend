import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          fiber: ["@react-three/fiber", "@react-three/drei"],
          react: ["react", "react-dom"],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    // DEV ONLY: proxy socket requests to local backend
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
