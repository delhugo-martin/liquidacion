// Aplica en orden los archivos de migrations/ que todavía no se aplicaron.
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool } from "./db.js";

const carpeta = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../migrations");

async function main() {
  await pool.query(`CREATE TABLE IF NOT EXISTS migraciones (
    nombre text PRIMARY KEY, aplicada timestamptz NOT NULL DEFAULT now())`);
  const { rows } = await pool.query<{ nombre: string }>("SELECT nombre FROM migraciones");
  const aplicadas = new Set(rows.map((r) => r.nombre));

  const archivos = (await readdir(carpeta)).filter((f) => f.endsWith(".sql")).sort();
  for (const archivo of archivos) {
    if (aplicadas.has(archivo)) continue;
    const sql = await readFile(path.join(carpeta, archivo), "utf8");
    const cliente = await pool.connect();
    try {
      await cliente.query("BEGIN");
      await cliente.query(sql);
      await cliente.query("INSERT INTO migraciones (nombre) VALUES ($1)", [archivo]);
      await cliente.query("COMMIT");
      console.log(`Aplicada: ${archivo}`);
    } catch (err) {
      await cliente.query("ROLLBACK");
      throw err;
    } finally {
      cliente.release();
    }
  }
  console.log("Base de datos al día.");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
