import pg from "pg";
import { config } from "./config.js";

// numeric -> number (montos) y date -> "YYYY-MM-DD" (sin corrimientos de zona horaria)
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => Number(v));
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 });

export type Cliente = pg.PoolClient;

/**
 * Ejecuta `fn` dentro de una transacción con app.usuario_id fijado.
 * Row Level Security usa ese valor: todas las consultas hechas con `cliente`
 * ven y modifican solo las filas de ese usuario.
 */
export async function comoUsuario<T>(usuarioId: string, fn: (cliente: Cliente) => Promise<T>): Promise<T> {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query("SELECT set_config('app.usuario_id', $1, true)", [usuarioId]);
    const resultado = await fn(cliente);
    await cliente.query("COMMIT");
    return resultado;
  } catch (err) {
    await cliente.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    cliente.release();
  }
}
