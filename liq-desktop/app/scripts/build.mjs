// Compila todo para empaquetar: la interfaz (Vite) y el proceso principal (esbuild).
import { build as vite } from "vite";
import { compilarMain } from "./compilar-main.mjs";

await vite({ configFile: "vite.config.ts" });
await compilarMain();
console.log("Listo: dist/");
