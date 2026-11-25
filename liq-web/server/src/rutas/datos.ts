import { Router, type Request, type Response } from "express";
import ExcelJS from "exceljs";
import { comoUsuario, type Cliente } from "../db.js";
import { ErrorHttp, esquemas, validar, param, noEncontrado } from "../validacion.js";

export const rutasDatos = Router();

/** Envuelve un manejador: corre dentro de la transacción del usuario y responde JSON. */
const conUsuario =
  (fn: (req: Request, cli: Cliente, res: Response) => Promise<unknown>, status = 200) =>
  async (req: Request, res: Response) => {
    const resultado = await comoUsuario(req.usuario!.id, (cli) => fn(req, cli, res));
    if (res.headersSent) return;
    if (resultado === undefined) res.status(204).end();
    else res.status(status).json(resultado);
  };

async function unaFila<T extends object>(cli: Cliente, sql: string, valores: unknown[], que: string): Promise<T> {
  const { rows } = await cli.query<T>(sql, valores);
  if (!rows[0]) throw noEncontrado(que);
  return rows[0];
}

async function existe(cli: Cliente, tabla: "profesionales" | "obras_sociales" | "unidades", id: string, que: string) {
  const { rowCount } = await cli.query(`SELECT 1 FROM ${tabla} WHERE id = $1`, [id]);
  if (!rowCount) throw noEncontrado(que);
}

// ---------- Profesionales ----------

const COLS_PROF = "id, nombre, matricula, cuit";

rutasDatos.get("/profesionales", conUsuario(async (_req, cli) => {
  const { rows } = await cli.query(`SELECT ${COLS_PROF} FROM profesionales ORDER BY nombre`);
  return rows;
}));

rutasDatos.post("/profesionales", conUsuario(async (req, cli) => {
  const d = validar(esquemas.profesional, req.body);
  return unaFila(cli,
    `INSERT INTO profesionales (nombre, matricula, cuit) VALUES ($1, $2, $3) RETURNING ${COLS_PROF}`,
    [d.nombre, d.matricula, d.cuit], "el profesional");
}, 201));

rutasDatos.put("/profesionales/:id", conUsuario(async (req, cli) => {
  const d = validar(esquemas.profesional, req.body);
  return unaFila(cli,
    `UPDATE profesionales SET nombre = $2, matricula = $3, cuit = $4 WHERE id = $1 RETURNING ${COLS_PROF}`,
    [param(req, "id"), d.nombre, d.matricula, d.cuit], "el profesional");
}));

rutasDatos.delete("/profesionales/:id", conUsuario(async (req, cli) => {
  await unaFila(cli, "DELETE FROM profesionales WHERE id = $1 RETURNING id", [param(req, "id")], "el profesional");
}));

// ---------- Obras sociales ----------

rutasDatos.get("/profesionales/:id/obras-sociales", conUsuario(async (req, cli) => {
  const pid = param(req, "id");
  await existe(cli, "profesionales", pid, "el profesional");
  const { rows } = await cli.query(
    `SELECT os.id, os.nombre, count(p.id)::int AS cantidad
       FROM obras_sociales os LEFT JOIN prestaciones p ON p.obra_social_id = os.id
      WHERE os.profesional_id = $1
      GROUP BY os.id ORDER BY os.orden, os.creado`,
    [pid]);
  return rows;
}));

rutasDatos.post("/profesionales/:id/obras-sociales", conUsuario(async (req, cli) => {
  const pid = param(req, "id");
  const d = validar(esquemas.obraSocial, req.body);
  await existe(cli, "profesionales", pid, "el profesional");
  return unaFila(cli,
    `INSERT INTO obras_sociales (profesional_id, nombre, orden)
     VALUES ($1, $2, (SELECT coalesce(max(orden), 0) + 1 FROM obras_sociales WHERE profesional_id = $1))
     RETURNING id, nombre, 0 AS cantidad`,
    [pid, d.nombre], "la obra social");
}, 201));

rutasDatos.put("/obras-sociales/:id", conUsuario(async (req, cli) => {
  const d = validar(esquemas.obraSocial, req.body);
  return unaFila(cli, "UPDATE obras_sociales SET nombre = $2 WHERE id = $1 RETURNING id, nombre",
    [param(req, "id"), d.nombre], "la obra social");
}));

rutasDatos.delete("/obras-sociales/:id", conUsuario(async (req, cli) => {
  await unaFila(cli, "DELETE FROM obras_sociales WHERE id = $1 RETURNING id", [param(req, "id")], "la obra social");
}));

// ---------- Aranceles ----------

// `monto` es siempre el monto en pesos: el fijo, o cantidad × valor de la unidad.
const SELECT_AR = `
  SELECT a.id, a.tipo, a.codigo, a.nombre,
         coalesce(a.monto, round(a.cantidad * u.valor, 2)) AS monto,
         a.unidad_id AS "unidadId", a.cantidad, u.nombre AS unidad
    FROM aranceles a LEFT JOIN unidades u ON u.id = a.unidad_id`;

const arancelPorId = (cli: Cliente, id: string) => unaFila(cli, `${SELECT_AR} WHERE a.id = $1`, [id], "el arancel");

/** La unidad elegida tiene que ser de esta obra social. */
async function revisarUnidad(cli: Cliente, unidadId: string | null, osId: string) {
  if (!unidadId) return;
  const { rowCount } = await cli.query("SELECT 1 FROM unidades WHERE id = $1 AND obra_social_id = $2", [unidadId, osId]);
  if (!rowCount) throw noEncontrado("la unidad en esta obra social");
}

rutasDatos.get("/obras-sociales/:id/aranceles", conUsuario(async (req, cli) => {
  const osId = param(req, "id");
  await existe(cli, "obras_sociales", osId, "la obra social");
  const { rows } = await cli.query(`${SELECT_AR} WHERE a.obra_social_id = $1 ORDER BY a.tipo, a.codigo`, [osId]);
  return rows;
}));

/** Crea el arancel, o actualiza nombre y monto/unidad si ya existe ese código. */
rutasDatos.post("/obras-sociales/:id/aranceles", conUsuario(async (req, cli) => {
  const osId = param(req, "id");
  const d = validar(esquemas.arancel, req.body);
  await existe(cli, "obras_sociales", osId, "la obra social");
  await revisarUnidad(cli, d.unidadId, osId);
  const { id } = await unaFila<{ id: string }>(cli,
    `INSERT INTO aranceles (obra_social_id, tipo, codigo, nombre, monto, unidad_id, cantidad) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (obra_social_id, tipo, codigo) DO UPDATE
       SET nombre = excluded.nombre, monto = excluded.monto, unidad_id = excluded.unidad_id, cantidad = excluded.cantidad
     RETURNING id`,
    [osId, d.tipo, d.codigo, d.nombre, d.monto, d.unidadId, d.cantidad], "el arancel");
  return arancelPorId(cli, id);
}));

/** Edita un arancel existente. No toca las prestaciones ya cargadas. */
rutasDatos.put("/aranceles/:id", conUsuario(async (req, cli) => {
  const id = param(req, "id");
  const d = validar(esquemas.arancel, req.body);
  const { obra_social_id: osId } = await unaFila<{ obra_social_id: string }>(cli,
    "SELECT obra_social_id FROM aranceles WHERE id = $1", [id], "el arancel");
  await revisarUnidad(cli, d.unidadId, osId);
  await cli.query(
    `UPDATE aranceles SET tipo = $2, codigo = $3, nombre = $4, monto = $5, unidad_id = $6, cantidad = $7 WHERE id = $1`,
    [id, d.tipo, d.codigo, d.nombre, d.monto, d.unidadId, d.cantidad]);
  return arancelPorId(cli, id);
}));

rutasDatos.delete("/aranceles/:id", conUsuario(async (req, cli) => {
  await unaFila(cli, "DELETE FROM aranceles WHERE id = $1 RETURNING id", [param(req, "id")], "el arancel");
}));

// ---------- Unidades (UB, galeno, ...) ----------

const COLS_UN = "id, nombre, valor";

rutasDatos.get("/obras-sociales/:id/unidades", conUsuario(async (req, cli) => {
  const osId = param(req, "id");
  await existe(cli, "obras_sociales", osId, "la obra social");
  const { rows } = await cli.query(`SELECT ${COLS_UN} FROM unidades WHERE obra_social_id = $1 ORDER BY nombre`, [osId]);
  return rows;
}));

rutasDatos.post("/obras-sociales/:id/unidades", conUsuario(async (req, cli) => {
  const osId = param(req, "id");
  const d = validar(esquemas.unidad, req.body);
  await existe(cli, "obras_sociales", osId, "la obra social");
  return unaFila(cli,
    `INSERT INTO unidades (obra_social_id, nombre, valor) VALUES ($1, $2, $3) RETURNING ${COLS_UN}`,
    [osId, d.nombre, d.valor], "la unidad");
}, 201));

rutasDatos.put("/unidades/:id", conUsuario(async (req, cli) => {
  const d = validar(esquemas.unidad, req.body);
  return unaFila(cli, `UPDATE unidades SET nombre = $2, valor = $3 WHERE id = $1 RETURNING ${COLS_UN}`,
    [param(req, "id"), d.nombre, d.valor], "la unidad");
}));

rutasDatos.delete("/unidades/:id", conUsuario(async (req, cli) => {
  const id = param(req, "id");
  const { rows: [uso] } = await cli.query<{ n: number }>("SELECT count(*)::int AS n FROM aranceles WHERE unidad_id = $1", [id]);
  if (uso && uso.n > 0)
    throw new ErrorHttp(409, `No se puede borrar: la usa${uso.n === 1 ? " 1 arancel" : `n ${uso.n} aranceles`}. Cambialos primero.`);
  await unaFila(cli, "DELETE FROM unidades WHERE id = $1 RETURNING id", [id], "la unidad");
}));

// ---------- Prestaciones ----------

const COLS_PR = "id, tipo, fecha, plan, afiliado, paciente, codigo, practica, monto, iva, marca";
const FILTRO_PERIODO = "obra_social_id = $1 AND ($2::date IS NULL OR fecha >= $2::date) AND ($3::date IS NULL OR fecha <= $3::date)";

function periodo(req: Request) {
  const p = validar(esquemas.periodo, req.query);
  return [p.desde ?? null, p.hasta ?? null] as const;
}

rutasDatos.get("/obras-sociales/:id/prestaciones", conUsuario(async (req, cli) => {
  const osId = param(req, "id");
  const [desde, hasta] = periodo(req);
  await existe(cli, "obras_sociales", osId, "la obra social");
  const { rows } = await cli.query(
    `SELECT ${COLS_PR} FROM prestaciones WHERE ${FILTRO_PERIODO} ORDER BY fecha, creado`, [osId, desde, hasta]);
  return rows;
}));

/** Último nombre, plan y marca usados por cada afiliado (para autocompletar). */
rutasDatos.get("/obras-sociales/:id/afiliados", conUsuario(async (req, cli) => {
  const osId = param(req, "id");
  const { rows } = await cli.query(
    `SELECT DISTINCT ON (afiliado) afiliado, paciente, plan, marca
       FROM prestaciones WHERE obra_social_id = $1 ORDER BY afiliado, creado DESC`, [osId]);
  return rows;
}));

rutasDatos.post("/obras-sociales/:id/prestaciones", conUsuario(async (req, cli) => {
  const osId = param(req, "id");
  const d = validar(esquemas.prestacion, req.body);
  await existe(cli, "obras_sociales", osId, "la obra social");
  return unaFila(cli,
    `INSERT INTO prestaciones (obra_social_id, tipo, fecha, plan, afiliado, paciente, codigo, practica, monto, iva, marca)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING ${COLS_PR}`,
    [osId, d.tipo, d.fecha, d.plan, d.afiliado, d.paciente, d.codigo, d.practica, d.monto, d.iva, d.marca],
    "la prestación");
}, 201));

rutasDatos.put("/prestaciones/:id", conUsuario(async (req, cli) => {
  const d = validar(esquemas.prestacion, req.body);
  return unaFila(cli,
    `UPDATE prestaciones SET tipo = $2, fecha = $3, plan = $4, afiliado = $5, paciente = $6, codigo = $7,
            practica = $8, monto = $9, iva = $10, marca = $11, modificado = now()
      WHERE id = $1 RETURNING ${COLS_PR}`,
    [param(req, "id"), d.tipo, d.fecha, d.plan, d.afiliado, d.paciente, d.codigo, d.practica, d.monto, d.iva, d.marca],
    "la prestación");
}));

rutasDatos.delete("/prestaciones/:id", conUsuario(async (req, cli) => {
  await unaFila(cli, "DELETE FROM prestaciones WHERE id = $1 RETURNING id", [param(req, "id")], "la prestación");
}));

// ---------- Exportar a Excel (XLSX) o CSV ----------

const COLUMNAS = ["TIPO", "PLAN", "N.DE AFILIADO", "APELLIDO Y NOMBRE", "FECHA", "PRACTICA", "COD.PRACTICA", "MONTO", "COND.IVA", "MARCA"];

async function exportar(req: Request, cli: Cliente, res: Response, formato: "csv" | "xlsx") {
  const osId = param(req, "id");
  const [desde, hasta] = periodo(req);
  const os = await unaFila<{ obra: string; profesional: string }>(cli,
    `SELECT os.nombre AS obra, p.nombre AS profesional
       FROM obras_sociales os JOIN profesionales p ON p.id = os.profesional_id WHERE os.id = $1`,
    [osId], "la obra social");
  const { rows } = await cli.query(
    `SELECT ${COLS_PR} FROM prestaciones WHERE ${FILTRO_PERIODO} ORDER BY tipo, fecha, creado`, [osId, desde, hasta]);

  const fecha = (iso: string) => { const [y, m, d] = iso.split("-"); return `${+d!}/${+m!}/${y}`; };
  const encabezado = [os.profesional, os.obra, desde ? `Desde ${fecha(desde)}` : "", hasta ? `Hasta ${fecha(hasta)}` : ""];
  const total = Math.round(rows.reduce((s, r) => s + r.monto, 0) * 100) / 100;

  // Nombre elegido por el usuario (sin caracteres que los sistemas de archivos no aceptan), o uno por defecto
  const elegido = (validar(esquemas.nombreArchivo, req.query).nombre ?? "")
    .replace(/[\u0000-\u001f\\/:*?"<>|]+/g, " ").replace(/\.(csv|xlsx)$/i, "").replace(/^[\s.]+/, "").replace(/\s+/g, " ").trim();
  const archivo = `${elegido || `${os.obra}_${desde ?? "inicio"}_${hasta ?? "hoy"}`}.${formato}`;
  const ascii = archivo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w. -]+/g, "_");
  res.setHeader("Content-Disposition", `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(archivo)}`);

  if (formato === "csv") {
    // Un texto que empieza con = + - @ Excel lo toma como fórmula: se le antepone ' para que quede como texto
    // (salvo números negativos, que no son peligrosos).
    const q = (v: unknown) => {
      let s = String(v ?? "");
      if (/^[=+@\t\r]/.test(s) || (s.startsWith("-") && !/^-\d+([.,]\d+)?$/.test(s))) s = "'" + s;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const num = (n: number) => n.toFixed(2).replace(".", ",");
    const lineas = [
      encabezado.map(q).join(";"),
      COLUMNAS.map(q).join(";"),
      ...rows.map((r) =>
        [r.tipo === "consulta" ? "CONSULTA" : "PRACTICA", r.plan, r.afiliado, r.paciente, fecha(r.fecha), r.practica,
          r.codigo, num(r.monto), r.iva, r.marca].map(q).join(";")),
      ["", "", "", "", "", "", "TOTAL", num(total), "", ""].map(q).join(";"),
    ];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.send("\ufeff" + lineas.join("\r\n"));
    return;
  }

  // XLSX con el formato de la planilla de siempre: título, y Consultas y Prácticas en tablas separadas.
  // Fechas y montos son fechas y números de verdad; cada tabla tiene su subtotal con fórmula.
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet(os.obra.slice(0, 31).replace(/[\\/?*[\]:]/g, " ") || "Prestaciones");
  const COLS = ["PLAN", "N.DE AFILIADO", "APELLIDO Y NOMBRE", "FECHA", "PRACTICA", "COD.PRACTICA", "MONTO", "COND.IVA", ""];
  const N = COLS.length; // la última columna (marca) va sin título, como en la planilla
  const fino = { style: "thin" } as const;
  const bordes = { top: fino, left: fino, bottom: fino, right: fino };
  [9, 15, 28, 11, 24, 14, 16, 13, 4].forEach((w, i) => { hoja.getColumn(i + 1).width = w; });

  // Título centrado en todo el ancho; con recuadro, solo en las columnas del medio (D:E), como el nombre de la obra social
  const titulo = (texto: string, size: number, recuadro = false) => {
    const fila = hoja.addRow([]);
    const [desdeCol, hastaCol] = recuadro ? [4, 5] : [1, N];
    hoja.mergeCells(fila.number, desdeCol, fila.number, hastaCol);
    const c = fila.getCell(desdeCol);
    c.value = texto;
    c.font = { bold: true, size };
    c.alignment = { horizontal: "center", vertical: "middle" };
    if (recuadro) { c.border = { top: { style: "medium" }, left: { style: "medium" }, bottom: { style: "medium" }, right: { style: "medium" } }; fila.height = size * 1.7; }
    return fila;
  };
  titulo(os.profesional, 14);
  titulo(os.obra, 14, true);
  const periodoTexto = [desde ? `Desde ${fecha(desde)}` : "", hasta ? `hasta ${fecha(hasta)}` : ""].filter(Boolean).join(" ");
  if (periodoTexto) titulo(periodoTexto, 10).getCell(1).font = { italic: true, size: 10 };

  const filasTotales: number[] = [];
  const seccion = (nombre: string, filas: typeof rows) => {
    if (!filas.length) return;
    hoja.addRow([]);
    titulo(nombre, 13);
    const enc = hoja.addRow(COLS);
    enc.eachCell({ includeEmpty: true }, (c, i) => {
      if (i > N) return;
      c.font = { bold: true }; c.alignment = { horizontal: "center" }; c.border = bordes;
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6EFEC" } };
    });
    const primera = enc.number + 1;
    for (const r of filas) {
      const [y, m, d] = (r.fecha as string).split("-").map(Number);
      const f = hoja.addRow([r.plan, r.afiliado, r.paciente, new Date(Date.UTC(y!, m! - 1, d!)), r.practica, r.codigo, r.monto, r.iva, r.marca]);
      for (let i = 1; i <= N; i++) f.getCell(i).border = bordes;
      f.getCell(1).alignment = { horizontal: "right" };
      f.getCell(6).alignment = { horizontal: "right" };
    }
    const ultima = primera + filas.length - 1;
    const sub = Math.round(filas.reduce((s, r) => s + r.monto, 0) * 100) / 100;
    const t = hoja.addRow(["", "", "", "", "", `TOTAL ${nombre}`, { formula: `SUM(G${primera}:G${ultima})`, result: sub }]);
    t.font = { bold: true };
    t.getCell(6).alignment = { horizontal: "right" };
    t.getCell(7).border = bordes;
    filasTotales.push(t.number);
  };
  seccion("CONSULTAS", rows.filter((r) => r.tipo === "consulta"));
  seccion("PRACTICAS", rows.filter((r) => r.tipo === "practica"));

  if (filasTotales.length > 1) {
    hoja.addRow([]);
    const t = hoja.addRow(["", "", "", "", "", "TOTAL A FACTURAR", { formula: filasTotales.map((n) => `G${n}`).join("+"), result: total }]);
    t.font = { bold: true, size: 12 };
    t.getCell(6).alignment = { horizontal: "right" };
    t.getCell(7).border = bordes;
  }
  hoja.getColumn(4).numFmt = "d/m/yyyy";
  hoja.getColumn(7).numFmt = '"$ "#,##0.00';
  hoja.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true };

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(Buffer.from(await libro.xlsx.writeBuffer()));
}

rutasDatos.get("/obras-sociales/:id/exportar.csv", conUsuario((req, cli, res) => exportar(req, cli, res, "csv")));
rutasDatos.get("/obras-sociales/:id/exportar.xlsx", conUsuario((req, cli, res) => exportar(req, cli, res, "xlsx")));
