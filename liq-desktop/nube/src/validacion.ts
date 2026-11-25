import { z } from "zod";
import type { Request } from "express";

export class ErrorHttp extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const noEncontrado = (que: string) => new ErrorHttp(404, `No se encontró ${que}.`);

const texto = (max: number) => z.string().trim().max(max);

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
  cantidadProfesionales: z.object({
    cantidad: z.number().int().min(0).max(10_000),
  }),
  id: z.string().uuid("Identificador inválido."),
};

export function validar<T extends z.ZodTypeAny>(esquema: T, datos: unknown): z.infer<T> {
  const r = esquema.safeParse(datos);
  if (!r.success) throw new ErrorHttp(400, r.error.issues[0]?.message ?? "Datos inválidos.");
  return r.data;
}

export const param = (req: Request, nombre: string) => validar(esquemas.id, req.params[nombre]);
