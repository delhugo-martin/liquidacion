import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Sitio de varias páginas: cada .html es una entrada y comparte los componentes de src/.
// `npm run build` deja el sitio estático listo para subir en dist/.
export default defineConfig({
  base: "./", // rutas relativas: funciona en la raíz del dominio o en una subcarpeta
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        inicio: "index.html",
        terminos: "terminos.html",
        privacidad: "privacidad.html",
      },
    },
  },
  server: { port: 5180 },
});
