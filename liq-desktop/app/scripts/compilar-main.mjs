// Compila el proceso principal y el preload de Electron con esbuild (un archivo cada uno).
import { build } from "esbuild";

export async function compilarMain({ watch = false } = {}) {
  const comun = { bundle: true, platform: "node", target: "node22", format: "cjs", external: ["electron"], sourcemap: true, logLevel: "warning" };
  await build({ ...comun, entryPoints: ["src/main/index.ts"], outfile: "dist/main/index.cjs" });
  await build({ ...comun, entryPoints: ["src/preload/index.ts"], outfile: "dist/preload/index.cjs" });
}
