import { z } from "zod";

export class ErrorHttp extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const noEncontrado = (que: string) => new ErrorHttp(404, `No se encontró ${que}.`);

const texto = (max: number) => z.string().trim().max(max);
const mayus = (max: number) => texto(max).transform((s) => s.toUpperCase());
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha tiene que tener formato AAAA-MM-DD.");
const monto = z.coerce.number().positive("El monto tiene que ser mayor a cero.").max(9_999_999_999).transform((n) => Math.round(n * 100) / 100);

export const esquemas = {
  registro: z.object({
    email: z.string().trim().toLowerCase().email("El email no es válido.").max(200),
    nombre: texto(120).min(1, "Falta el nombre."),
    password: z.string().min(10, "La contraseña tiene que tener al menos 10 caracteres.").max(200),
    aceptaTerminos: z.literal(true, { errorMap: () => ({ message: "Tenés que aceptar los términos y la política de privacidad." }) }),
  }),
  login: z.object({
    email: z.string().trim().toLowerCase().max(200),
    password: z.string().max(200),
  }),
  profesional: z.object({
    nombre: mayus(120).pipe(z.string().min(1, "Falta el nombre del profesional.")),
    matricula: texto(40).default(""),
    cuit: texto(20).default(""),
  }),
  obraSocial: z.object({
    nombre: mayus(80).pipe(z.string().min(1, "Falta el nombre de la obra social.")),
  }),
  // O monto fijo, o cantidad de una unidad de la obra social (ej. 2,5 UB)
  arancel: z.object({
    tipo: z.enum(["consulta", "practica"]),
    codigo: texto(20).min(1, "Falta el código."),
    nombre: mayus(120).pipe(z.string().min(1, "Falta el nombre.")),
  }).and(z.union([
    z.object({ monto, unidadId: z.null().optional(), cantidad: z.null().optional() })
      .transform((d) => ({ monto: d.monto, unidadId: null, cantidad: null })),
    z.object({
      monto: z.null().optional(),
      unidadId: z.string().uuid("Elegí una unidad."),
      cantidad: z.coerce.number().positive("La cantidad tiene que ser mayor a cero.").max(99_999_999)
        .transform((n) => Math.round(n * 10000) / 10000),
    }).transform((d) => ({ monto: null, unidadId: d.unidadId, cantidad: d.cantidad })),
  ], { errorMap: () => ({ message: "Poné un monto, o una cantidad y su unidad." }) })),
  unidad: z.object({
    nombre: mayus(20).pipe(z.string().min(1, "Falta el nombre de la unidad.")),
    valor: monto,
  }),
  prestacion: z.object({
    tipo: z.enum(["consulta", "practica"]),
    fecha,
    plan: mayus(20).default(""),
    afiliado: texto(40).min(1, "Falta el número de afiliado."),
    paciente: mayus(120).pipe(z.string().min(1, "Falta el apellido y nombre.")),
    codigo: texto(20).min(1, "Falta el código de práctica."),
    practica: mayus(120).pipe(z.string().min(1, "Falta la práctica.")),
    monto,
    iva: z.enum(["GRAVADO", "NO GRAVADO"]),
    marca: mayus(3).default(""),
  }),
  periodo: z.object({
    desde: fecha.optional(),
    hasta: fecha.optional(),
  }),
  nombreArchivo: z.object({
    nombre: z.string().max(120, "El nombre del archivo es muy largo.").optional(),
  }),
  id: z.string().uuid("Identificador inválido."),
};

export function validar<T extends z.ZodTypeAny>(esquema: T, datos: unknown): z.infer<T> {
  const r = esquema.safeParse(datos);
  if (!r.success) throw new ErrorHttp(400, r.error.issues[0]?.message ?? "Datos inválidos.");
  return r.data;
}
