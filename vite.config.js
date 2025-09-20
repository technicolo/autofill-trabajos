import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: "src/popup.jsx",
      output: {
        entryFileNames: "popup.js",
        assetFileNames: "[name][extname]"
      }
    }
  }
});
