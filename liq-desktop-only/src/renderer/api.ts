import type { Afiliado, Arancel, ObraSocial, Unidad, Periodo, Prestacion, PrestacionDatos, Profesional, Tipo } from "./tipos";

/** Un arancel con monto fijo, o con cantidad de una unidad. */
export type DatosArancel = { tipo: Tipo; codigo: string; nombre: string } &
  ({ monto: number } | { unidadId: string; cantidad: number });

export class ErrorApi extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Versión solo escritorio: en vez de pedirle a un servidor web, la interfaz le pide a la app (proceso principal de
// Electron), que guarda los datos en la PC. No hay cuenta ni internet. Las rutas son las mismas que en liq-web.
type Respuesta = { ok: true; datos: unknown } | { ok: false; status: number; error: string };
declare global {
  interface Window {
    liq: {
      pedir: (metodo: string, ruta: string, cuerpo?: unknown) => Promise<Respuesta>;
      exportar: (osId: string, query: Record<string, string>, formato: "csv" | "xlsx") => Promise<Respuesta>;
      carpetaDatos: () => Promise<string | null>;
    };
  }
}

function desenvolver<T>(r: Respuesta): T {
  if (r.ok) return r.datos as T;
  throw new ErrorApi(r.status, r.error);
}

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  return desenvolver<T>(await window.liq.pedir(metodo, ruta, cuerpo));
}

const qs = (p: Periodo) => {
  const s = new URLSearchParams();
  if (p.desde) s.set("desde", p.desde);
  if (p.hasta) s.set("hasta", p.hasta);
  const t = s.toString();
  return t ? `?${t}` : "";
};

export const api = {
  /** Dónde está el archivo de datos en la PC. */
  carpetaDatos: () => window.liq.carpetaDatos(),

  profesionales: () => pedir<Profesional[]>("GET", "/profesionales"),
  crearProfesional: (d: Omit<Profesional, "id">) => pedir<Profesional>("POST", "/profesionales", d),
  editarProfesional: (id: string, d: Omit<Profesional, "id">) => pedir<Profesional>("PUT", `/profesionales/${id}`, d),
  borrarProfesional: (id: string) => pedir<void>("DELETE", `/profesionales/${id}`),

  obrasSociales: (pid: string) => pedir<ObraSocial[]>("GET", `/profesionales/${pid}/obras-sociales`),
  crearObraSocial: (pid: string, nombre: string) => pedir<ObraSocial>("POST", `/profesionales/${pid}/obras-sociales`, { nombre }),
  borrarObraSocial: (id: string) => pedir<void>("DELETE", `/obras-sociales/${id}`),

  aranceles: (osId: string) => pedir<Arancel[]>("GET", `/obras-sociales/${osId}/aranceles`),
  guardarArancel: (osId: string, d: DatosArancel) =>
    pedir<Arancel>("POST", `/obras-sociales/${osId}/aranceles`, d),
  editarArancel: (id: string, d: DatosArancel) =>
    pedir<Arancel>("PUT", `/aranceles/${id}`, d),
  borrarArancel: (id: string) => pedir<void>("DELETE", `/aranceles/${id}`),

  unidades: (osId: string) => pedir<Unidad[]>("GET", `/obras-sociales/${osId}/unidades`),
  crearUnidad: (osId: string, d: Omit<Unidad, "id">) => pedir<Unidad>("POST", `/obras-sociales/${osId}/unidades`, d),
  editarUnidad: (id: string, d: Omit<Unidad, "id">) => pedir<Unidad>("PUT", `/unidades/${id}`, d),
  borrarUnidad: (id: string) => pedir<void>("DELETE", `/unidades/${id}`),

  prestaciones: (osId: string, p: Periodo) => pedir<Prestacion[]>("GET", `/obras-sociales/${osId}/prestaciones${qs(p)}`),
  afiliados: (osId: string) => pedir<Afiliado[]>("GET", `/obras-sociales/${osId}/afiliados`),
  crearPrestacion: (osId: string, d: PrestacionDatos) => pedir<Prestacion>("POST", `/obras-sociales/${osId}/prestaciones`, d),
  editarPrestacion: (id: string, d: PrestacionDatos) => pedir<Prestacion>("PUT", `/prestaciones/${id}`, d),
  borrarPrestacion: (id: string) => pedir<void>("DELETE", `/prestaciones/${id}`),

  /** Arma la planilla y abre "Guardar como". Devuelve dónde se guardó, o null si se canceló. */
  exportar: async (osId: string, p: Periodo, nombre: string, formato: "xlsx" | "csv") => {
    const query: Record<string, string> = {};
    if (p.desde) query.desde = p.desde;
    if (p.hasta) query.hasta = p.hasta;
    if (nombre.trim()) query.nombre = nombre.trim();
    return desenvolver<{ guardado: string | null }>(await window.liq.exportar(osId, query, formato)).guardado;
  },
};
