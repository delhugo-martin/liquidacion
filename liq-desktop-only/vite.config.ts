import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// La interfaz (renderer). En la app empaquetada se abre desde archivos locales, por eso base "./".
// En producción se agrega una Content-Security-Policy estricta: solo código y estilos propios, nada de internet.
export default defineConfig({
  root: "src/renderer",
  base: "./",
  plugins: [
    react(),
    {
      name: "csp",
      apply: "build",
      transformIndexHtml: (html) => html.replace("<head>",
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'" />`),
    },
  ],
  build: { outDir: "../../dist/renderer", emptyOutDir: true },
  server: { port: 5175, strictPort: true },
});
