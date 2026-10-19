import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Configuración tomada de Figma Make sin los plugins internos de Figma.
// BASE_URL permite publicar en una subcarpeta (p. ej. GitHub Pages: BASE_URL=/FIRA/ npm run build).
export default defineConfig({
  base: process.env.BASE_URL ?? "/",
  plugins: [react(), tailwindcss()],
  server: { port: 5173,
    watch: {
      ignored: ["**/asistente-proxy/**", "**/.wrangler/**"],
    },
  },
});
