import type { Afiliado, Arancel, ObraSocial, Unidad, Periodo, Prestacion, PrestacionDatos, Profesional, Tipo, Usuario } from "./tipos";

/** Un arancel con monto fijo, o con cantidad de una unidad. */
export type DatosArancel = { tipo: Tipo; codigo: string; nombre: string } &
  ({ monto: number } | { unidadId: string; cantidad: number });

export class ErrorApi extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Se llama cuando el servidor responde 401 (sesión vencida). App lo usa para volver al ingreso. */
let alExpirar: () => void = () => {};
export const onSesionExpirada = (fn: () => void) => { alExpirar = fn; };

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${ruta}`, {
      method: metodo,
      credentials: "same-origin",
      headers: cuerpo !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi(0, "No hay conexión con el servidor. Revisá tu internet.");
  }
  if (res.status === 204) return undefined as T;
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !ruta.startsWith("/auth/")) alExpirar();
    throw new ErrorApi(res.status, datos.error ?? "Ocurrió un error inesperado.");
  }
  return datos as T;
}

const qs = (p: Periodo) => {
  const s = new URLSearchParams();
  if (p.desde) s.set("desde", p.desde);
  if (p.hasta) s.set("hasta", p.hasta);
  const t = s.toString();
  return t ? `?${t}` : "";
};

export const api = {
  yo: () => pedir<Usuario>("GET", "/auth/yo"),
  ingresar: (email: string, password: string) => pedir<Usuario>("POST", "/auth/login", { email, password }),
  registrarse: (d: { email: string; nombre: string; password: string; aceptaTerminos: boolean }) =>
    pedir<Usuario>("POST", "/auth/registro", d),
  salir: () => pedir<void>("POST", "/auth/logout"),

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

  urlExportar: (osId: string, p: Periodo, nombre: string, formato: "xlsx" | "csv") => {
    const s = new URLSearchParams();
    if (p.desde) s.set("desde", p.desde);
    if (p.hasta) s.set("hasta", p.hasta);
    if (nombre.trim()) s.set("nombre", nombre.trim());
    const t = s.toString();
    return `/api/obras-sociales/${osId}/exportar.${formato}${t ? `?${t}` : ""}`;
  },
};
