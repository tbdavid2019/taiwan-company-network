import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": "/src",
      assets: "/src/assets",
      components: "/src/components",
      context: "/src/context",
      layouts: "/src/layouts",
      views: "/src/views",
      "routes.js": "/src/routes.js",
    },
  },
  server: {
    port: 3000,
  },
});
