export type Tipo = "consulta" | "practica";
export type Iva = "GRAVADO" | "NO GRAVADO";

export interface Usuario { id: string; email: string; nombre: string }
export interface Profesional { id: string; nombre: string; matricula: string; cuit: string }
export interface ObraSocial { id: string; nombre: string; cantidad: number }
/** `monto` es siempre en pesos: el fijo, o cantidad × valor de la unidad. */
export interface Arancel {
  id: string; tipo: Tipo; codigo: string; nombre: string; monto: number;
  unidadId: string | null; cantidad: number | null; unidad: string | null;
}
export interface Unidad { id: string; nombre: string; valor: number }
export interface Afiliado { afiliado: string; paciente: string; plan: string; marca: string }

export interface PrestacionDatos {
  tipo: Tipo;
  fecha: string; // AAAA-MM-DD
  plan: string;
  afiliado: string;
  paciente: string;
  codigo: string;
  practica: string;
  monto: number;
  iva: Iva;
  marca: string;
}
export interface Prestacion extends PrestacionDatos { id: string }

export interface Periodo { desde: string; hasta: string }
