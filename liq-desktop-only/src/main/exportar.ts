import ExcelJS from "exceljs";
import type { Base } from "./base.js";
import { COLS_PR, FILTRO_PERIODO, periodo } from "./rutas.js";
import { esquemas, noEncontrado, validar } from "./validacion.js";

interface Fila {
  tipo: string; fecha: string; plan: string; afiliado: string; paciente: string;
  codigo: string; practica: string; monto: number; iva: string; marca: string;
}

/** Arma el archivo (CSV o Excel) de una obra social y período. Devuelve el nombre sugerido y el contenido. */
export async function armarExportacion(db: Base, osId: string, query: Record<string, string>, formato: "csv" | "xlsx") {
  validar(esquemas.id, osId);
  const [desde, hasta] = periodo(query);
  const os = db.prepare(
    `SELECT os.nombre AS obra, p.nombre AS profesional
       FROM obras_sociales os JOIN profesionales p ON p.id = os.profesional_id WHERE os.id = ?`).get(osId) as
    { obra: string; profesional: string } | undefined;
  if (!os) throw noEncontrado("la obra social");
  const rows = db.prepare(`SELECT ${COLS_PR} FROM prestaciones WHERE ${FILTRO_PERIODO} ORDER BY tipo, fecha, creado`)
    .all(osId, desde, hasta) as unknown as Fila[];

  const fecha = (iso: string) => { const [y, m, d] = iso.split("-"); return `${+d!}/${+m!}/${y}`; };
  const total = Math.round(rows.reduce((s, r) => s + r.monto, 0) * 100) / 100;

  // Nombre elegido por el usuario (sin caracteres que los sistemas de archivos no aceptan), o uno por defecto
  const elegido = (validar(esquemas.nombreArchivo, query).nombre ?? "")
    .replace(/[\u0000-\u001f\\/:*?"<>|]+/g, " ").replace(/\.(csv|xlsx)$/i, "").replace(/^[\s.]+/, "").replace(/\s+/g, " ").trim();
  const archivo = `${elegido || `${os.obra}_${desde ?? "inicio"}_${hasta ?? "hoy"}`}.${formato}`;

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
      [os.profesional, os.obra, desde ? `Desde ${fecha(desde)}` : "", hasta ? `Hasta ${fecha(hasta)}` : ""].map(q).join(";"),
      ["TIPO", "PLAN", "N.DE AFILIADO", "APELLIDO Y NOMBRE", "FECHA", "PRACTICA", "COD.PRACTICA", "MONTO", "COND.IVA", "MARCA"].map(q).join(";"),
      ...rows.map((r) =>
        [r.tipo === "consulta" ? "CONSULTA" : "PRACTICA", r.plan, r.afiliado, r.paciente, fecha(r.fecha), r.practica,
          r.codigo, num(r.monto), r.iva, r.marca].map(q).join(";")),
      ["", "", "", "", "", "", "TOTAL", num(total), "", ""].map(q).join(";"),
    ];
    return { archivo, contenido: Buffer.from("﻿" + lineas.join("\r\n"), "utf8") };
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
  const seccion = (nombre: string, filas: Fila[]) => {
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
      const [y, m, d] = r.fecha.split("-").map(Number);
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

  return { archivo, contenido: Buffer.from(await libro.xlsx.writeBuffer()) };
}
