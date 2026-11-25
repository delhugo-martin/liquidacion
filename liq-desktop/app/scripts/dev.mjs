// Desarrollo: levanta la interfaz con Vite (recarga sola al guardar) y abre Electron apuntando a ella.
// La nube tiene que estar corriendo (cd ../nube && npm run dev). Su dirección: LIQ_NUBE_URL (por defecto http://localhost:3100).
import { createServer } from "vite";
import { spawn } from "node:child_process";
import electron from "electron";
import { compilarMain } from "./compilar-main.mjs";

const servidor = await createServer({ configFile: "vite.config.ts" });
await servidor.listen();
const url = servidor.resolvedUrls.local[0];
await compilarMain();

const app = spawn(electron, ["."], {
  stdio: "inherit",
  env: { ...process.env, LIQ_DEV_URL: url, LIQ_NUBE_URL: process.env.LIQ_NUBE_URL ?? "http://localhost:3100" },
});
app.on("close", async (codigo) => { await servidor.close(); process.exit(codigo ?? 0); });
