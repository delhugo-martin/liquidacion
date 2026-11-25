function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. Revisá el archivo .env (hay un ejemplo en .env.example).`);
  }
  return valor;
}

export const config = {
  databaseUrl: requerida("DATABASE_URL"),
  appOrigin: requerida("APP_ORIGIN"),
  port: Number(process.env.PORT ?? 3000),
  produccion: process.env.NODE_ENV === "production",
  /**
   * Cuántos proxies (ej. el HTTPS del hosting) hay delante del servidor. 0 si se conecta directo.
   * Si se pone de más, cualquiera puede inventar su IP con X-Forwarded-For y saltear el límite de intentos de ingreso.
   */
  proxies: Number(process.env.TRUST_PROXY ?? 0),
  /** Duración de una sesión iniciada. */
  duracionSesionMs: 1000 * 60 * 60 * 12,
};
