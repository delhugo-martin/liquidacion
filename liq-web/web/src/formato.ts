export const pesos = (n: number) =>
  "$ " + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "2026-09-18" -> "18/09/26". Vacío si no hay fecha. */
export const isoATexto = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y!.slice(2)}`;
};
export const fechaCorta = isoATexto;

/** "18/09/26" -> "2026-09-18". Devuelve null si está incompleta o no existe (ej. 31/02/26). */
export const textoAFecha = (texto: string) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(texto);
  if (!m) return null;
  const [d, mes, a] = [Number(m[1]), Number(m[2]), 2000 + Number(m[3])];
  const f = new Date(Date.UTC(a, mes - 1, d));
  if (f.getUTCFullYear() !== a || f.getUTCMonth() !== mes - 1 || f.getUTCDate() !== d) return null;
  return `${a}-${m[2]}-${m[1]}`;
};

/** Acepta "28458", "28.458,00", "28458.5" o "$ 28.458". Devuelve NaN si no es un número. */
export const leerMonto = (texto: string) => {
  let s = texto.replace(/\$|\s/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  return s === "" ? NaN : Number(s);
};

/** Cantidad de unidades: 2.5 -> "2,5" (hasta 4 decimales). */
export const cantidadTexto = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 4 });

export const montoEditable = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2 });

export const hoy = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

/** Avisos breves al pie de la pantalla. */
export const avisar = (mensaje: string) => window.dispatchEvent(new CustomEvent("aviso", { detail: mensaje }));

export const mensajeDe = (err: unknown) => (err instanceof Error ? err.message : "Ocurrió un error inesperado.");
