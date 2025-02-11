import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          pdfjsWorker: ["pdfjs-dist/build/pdf.worker.min"],
        },
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  server: {
    fs: {
      // Allow serving files from these directories
      allow: ["node_modules", "src"],
      strict: false,
    },
  },
  optimizeDeps: {
    include: ["pdfjs-dist"],
  },
});
