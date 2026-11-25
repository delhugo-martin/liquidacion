// Desarrollo: levanta la interfaz con Vite (recarga sola al guardar) y abre Electron apuntando a ella.
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
  env: { ...process.env, LIQ_DEV_URL: url },
});
app.on("close", async (codigo) => { await servidor.close(); process.exit(codigo ?? 0); });
