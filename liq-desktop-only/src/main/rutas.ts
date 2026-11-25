import { randomUUID } from "node:crypto";
import { type Base, enTransaccion } from "./base.js";
import { ErrorHttp, esquemas, noEncontrado, validar } from "./validacion.js";

/**
 * Las mismas operaciones que la API de liq-web, pero sobre la base local.
 * La interfaz las pide como "GET /obras-sociales/:id/aranceles" (ver api.ts del renderer),
 * así las pantallas son las mismas en la web y en el escritorio.
 */

export interface Contexto {
  db: Base;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
}
type Manejador = (c: Contexto) => unknown | Promise<unknown>;

const rutas: { metodo: string; partes: string[]; fn: Manejador }[] = [];
const ruta = (metodo: string, patron: string, fn: Manejador) =>
  rutas.push({ metodo, partes: patron.split("/").filter(Boolean), fn });

/** Busca la ruta que corresponde a "METODO /camino?consulta". */
export function resolver(metodo: string, url: string) {
  const [camino = "", consulta = ""] = url.split("?");
  const partes = camino.split("/").filter(Boolean);
  for (const r of rutas) {
    if (r.metodo !== metodo || r.partes.length !== partes.length) continue;
    const params: Record<string, string> = {};
    const coincide = r.partes.every((p, i) => {
      if (p.startsWith(":")) { params[p.slice(1)] = decodeURIComponent(partes[i]!); return true; }
      return p === partes[i];
    });
    if (coincide) return { fn: r.fn, params, query: Object.fromEntries(new URLSearchParams(consulta)) };
  }
  return null;
}

const id = (c: Contexto, nombre = "id") => validar(esquemas.id, c.params[nombre]);
const nuevoId = () => randomUUID();

function una<T>(fila: unknown, que: string): T {
  if (!fila) throw noEncontrado(que);
  return fila as T;
}

function existe(db: Base, tabla: "profesionales" | "obras_sociales" | "unidades", valor: string, que: string) {
  una(db.prepare(`SELECT 1 FROM ${tabla} WHERE id = ?`).get(valor), que);
}

// ---------- Profesionales ----------

const COLS_PROF = "id, nombre, matricula, cuit";

ruta("GET", "/profesionales", ({ db }) => db.prepare(`SELECT ${COLS_PROF} FROM profesionales ORDER BY nombre`).all());

// Versión sin cuenta: no hay límite de profesionales.
ruta("POST", "/profesionales", ({ db, body }) => {
  const d = validar(esquemas.profesional, body);
  return db.prepare(`INSERT INTO profesionales (id, nombre, matricula, cuit) VALUES (?, ?, ?, ?) RETURNING ${COLS_PROF}`)
    .get(nuevoId(), d.nombre, d.matricula, d.cuit);
});

ruta("PUT", "/profesionales/:id", (c) => {
  const d = validar(esquemas.profesional, c.body);
  return una(c.db.prepare(`UPDATE profesionales SET nombre = ?, matricula = ?, cuit = ? WHERE id = ? RETURNING ${COLS_PROF}`)
    .get(d.nombre, d.matricula, d.cuit, id(c)), "el profesional");
});

ruta("DELETE", "/profesionales/:id", (c) => {
  una(c.db.prepare("DELETE FROM profesionales WHERE id = ? RETURNING id").get(id(c)), "el profesional");
});

// ---------- Obras sociales ----------

ruta("GET", "/profesionales/:id/obras-sociales", (c) => {
  const pid = id(c);
  existe(c.db, "profesionales", pid, "el profesional");
  return c.db.prepare(
    `SELECT os.id, os.nombre, count(p.id) AS cantidad
       FROM obras_sociales os LEFT JOIN prestaciones p ON p.obra_social_id = os.id
      WHERE os.profesional_id = ?
      GROUP BY os.id ORDER BY os.orden, os.creado`).all(pid);
});

ruta("POST", "/profesionales/:id/obras-sociales", (c) => {
  const pid = id(c);
  const d = validar(esquemas.obraSocial, c.body);
  existe(c.db, "profesionales", pid, "el profesional");
  return c.db.prepare(
    `INSERT INTO obras_sociales (id, profesional_id, nombre, orden)
     VALUES (?, ?, ?, (SELECT coalesce(max(orden), 0) + 1 FROM obras_sociales WHERE profesional_id = ?))
     RETURNING id, nombre, 0 AS cantidad`).get(nuevoId(), pid, d.nombre, pid);
});

ruta("PUT", "/obras-sociales/:id", (c) => {
  const d = validar(esquemas.obraSocial, c.body);
  return una(c.db.prepare("UPDATE obras_sociales SET nombre = ? WHERE id = ? RETURNING id, nombre").get(d.nombre, id(c)), "la obra social");
});

ruta("DELETE", "/obras-sociales/:id", (c) => {
  una(c.db.prepare("DELETE FROM obras_sociales WHERE id = ? RETURNING id").get(id(c)), "la obra social");
});

// ---------- Aranceles ----------

// `monto` es siempre el monto en pesos: el fijo, o cantidad × valor de la unidad.
const SELECT_AR = `
  SELECT a.id, a.tipo, a.codigo, a.nombre,
         coalesce(a.monto, round(a.cantidad * u.valor, 2)) AS monto,
         a.unidad_id AS unidadId, a.cantidad, u.nombre AS unidad
    FROM aranceles a LEFT JOIN unidades u ON u.id = a.unidad_id`;

const arancelPorId = (db: Base, arId: string) => una(db.prepare(`${SELECT_AR} WHERE a.id = ?`).get(arId), "el arancel");

/** La unidad elegida tiene que ser de esta obra social. */
function revisarUnidad(db: Base, unidadId: string | null, osId: string) {
  if (!unidadId) return;
  una(db.prepare("SELECT 1 FROM unidades WHERE id = ? AND obra_social_id = ?").get(unidadId, osId), "la unidad en esta obra social");
}

ruta("GET", "/obras-sociales/:id/aranceles", (c) => {
  const osId = id(c);
  existe(c.db, "obras_sociales", osId, "la obra social");
  return c.db.prepare(`${SELECT_AR} WHERE a.obra_social_id = ? ORDER BY a.tipo, a.codigo`).all(osId);
});

/** Crea el arancel, o actualiza nombre y monto/unidad si ya existe ese código. */
ruta("POST", "/obras-sociales/:id/aranceles", (c) => {
  const osId = id(c);
  const d = validar(esquemas.arancel, c.body);
  existe(c.db, "obras_sociales", osId, "la obra social");
  revisarUnidad(c.db, d.unidadId, osId);
  const { id: arId } = c.db.prepare(
    `INSERT INTO aranceles (id, obra_social_id, tipo, codigo, nombre, monto, unidad_id, cantidad) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (obra_social_id, tipo, codigo) DO UPDATE
       SET nombre = excluded.nombre, monto = excluded.monto, unidad_id = excluded.unidad_id, cantidad = excluded.cantidad
     RETURNING id`).get(nuevoId(), osId, d.tipo, d.codigo, d.nombre, d.monto, d.unidadId, d.cantidad) as { id: string };
  return arancelPorId(c.db, arId);
});

/** Edita un arancel existente. No toca las prestaciones ya cargadas. */
ruta("PUT", "/aranceles/:id", (c) => {
  const arId = id(c);
  const d = validar(esquemas.arancel, c.body);
  const { obra_social_id: osId } = una<{ obra_social_id: string }>(
    c.db.prepare("SELECT obra_social_id FROM aranceles WHERE id = ?").get(arId), "el arancel");
  revisarUnidad(c.db, d.unidadId, osId);
  c.db.prepare("UPDATE aranceles SET tipo = ?, codigo = ?, nombre = ?, monto = ?, unidad_id = ?, cantidad = ? WHERE id = ?")
    .run(d.tipo, d.codigo, d.nombre, d.monto, d.unidadId, d.cantidad, arId);
  return arancelPorId(c.db, arId);
});

ruta("DELETE", "/aranceles/:id", (c) => {
  una(c.db.prepare("DELETE FROM aranceles WHERE id = ? RETURNING id").get(id(c)), "el arancel");
});

// ---------- Unidades (UB, galeno, ...) ----------

const COLS_UN = "id, nombre, valor";

ruta("GET", "/obras-sociales/:id/unidades", (c) => {
  const osId = id(c);
  existe(c.db, "obras_sociales", osId, "la obra social");
  return c.db.prepare(`SELECT ${COLS_UN} FROM unidades WHERE obra_social_id = ? ORDER BY nombre`).all(osId);
});

ruta("POST", "/obras-sociales/:id/unidades", (c) => {
  const osId = id(c);
  const d = validar(esquemas.unidad, c.body);
  existe(c.db, "obras_sociales", osId, "la obra social");
  return c.db.prepare(`INSERT INTO unidades (id, obra_social_id, nombre, valor) VALUES (?, ?, ?, ?) RETURNING ${COLS_UN}`)
    .get(nuevoId(), osId, d.nombre, d.valor);
});

ruta("PUT", "/unidades/:id", (c) => {
  const d = validar(esquemas.unidad, c.body);
  return una(c.db.prepare(`UPDATE unidades SET nombre = ?, valor = ? WHERE id = ? RETURNING ${COLS_UN}`)
    .get(d.nombre, d.valor, id(c)), "la unidad");
});

ruta("DELETE", "/unidades/:id", (c) => {
  const unId = id(c);
  const { n } = c.db.prepare("SELECT count(*) AS n FROM aranceles WHERE unidad_id = ?").get(unId) as { n: number };
  if (n > 0) throw new ErrorHttp(409, `No se puede borrar: la usa${n === 1 ? " 1 arancel" : `n ${n} aranceles`}. Cambialos primero.`);
  una(c.db.prepare("DELETE FROM unidades WHERE id = ? RETURNING id").get(unId), "la unidad");
});

// ---------- Prestaciones ----------

export const COLS_PR = "id, tipo, fecha, plan, afiliado, paciente, codigo, practica, monto, iva, marca";
export const FILTRO_PERIODO = "obra_social_id = ? AND (?2 IS NULL OR fecha >= ?2) AND (?3 IS NULL OR fecha <= ?3)";

export function periodo(query: Record<string, string>) {
  const p = validar(esquemas.periodo, query);
  return [p.desde ?? null, p.hasta ?? null] as const;
}

ruta("GET", "/obras-sociales/:id/prestaciones", (c) => {
  const osId = id(c);
  const [desde, hasta] = periodo(c.query);
  existe(c.db, "obras_sociales", osId, "la obra social");
  return c.db.prepare(`SELECT ${COLS_PR} FROM prestaciones WHERE ${FILTRO_PERIODO} ORDER BY fecha, creado`).all(osId, desde, hasta);
});

/** Último nombre, plan y marca usados por cada afiliado (para autocompletar). */
ruta("GET", "/obras-sociales/:id/afiliados", (c) =>
  // En SQLite, con max() las demás columnas salen de la fila del máximo: la carga más reciente de cada afiliado.
  c.db.prepare(
    `SELECT afiliado, paciente, plan, marca, max(creado) AS ultimo
       FROM prestaciones WHERE obra_social_id = ? GROUP BY afiliado ORDER BY afiliado`).all(id(c))
    .map((f) => { const { ultimo: _, ...resto } = f as Record<string, unknown>; return resto; }));

ruta("POST", "/obras-sociales/:id/prestaciones", (c) => {
  const osId = id(c);
  const d = validar(esquemas.prestacion, c.body);
  existe(c.db, "obras_sociales", osId, "la obra social");
  return c.db.prepare(
    `INSERT INTO prestaciones (id, obra_social_id, tipo, fecha, plan, afiliado, paciente, codigo, practica, monto, iva, marca)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING ${COLS_PR}`)
    .get(nuevoId(), osId, d.tipo, d.fecha, d.plan, d.afiliado, d.paciente, d.codigo, d.practica, d.monto, d.iva, d.marca);
});

ruta("PUT", "/prestaciones/:id", (c) => {
  const d = validar(esquemas.prestacion, c.body);
  return una(c.db.prepare(
    `UPDATE prestaciones SET tipo = ?, fecha = ?, plan = ?, afiliado = ?, paciente = ?, codigo = ?,
            practica = ?, monto = ?, iva = ?, marca = ?, modificado = strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id = ? RETURNING ${COLS_PR}`)
    .get(d.tipo, d.fecha, d.plan, d.afiliado, d.paciente, d.codigo, d.practica, d.monto, d.iva, d.marca, id(c)), "la prestación");
});

ruta("DELETE", "/prestaciones/:id", (c) => {
  una(c.db.prepare("DELETE FROM prestaciones WHERE id = ? RETURNING id").get(id(c)), "la prestación");
});

/** Ejecuta un pedido de la interfaz. Los errores de la base se traducen a mensajes claros. */
export async function atender(db: Base, metodo: string, url: string, body: unknown) {
  const r = resolver(metodo, url);
  if (!r) throw new ErrorHttp(404, "Ruta inexistente.");
  try {
    // Lo que cambia datos corre en una transacción.
    const c = { db, params: r.params, query: r.query, body };
    return metodo === "GET" ? await r.fn(c) : enTransaccion(db, () => r.fn(c));
  } catch (err) {
    const msg = (err as Error)?.message ?? "";
    if (msg.includes("UNIQUE constraint failed")) throw new ErrorHttp(409, "Ya existe un registro con ese nombre o código.");
    if (msg.includes("FOREIGN KEY constraint failed")) throw new ErrorHttp(409, "Hay otros datos que dependen de este registro.");
    throw err;
  }
}
