import { safeStorage } from "electron";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { ErrorHttp } from "./validacion.js";

/**
 * Comunicación con la nube: SOLO login, cuenta/plan y cantidad de profesionales.
 * Ningún dato de profesionales, pacientes ni prestaciones se manda a internet.
 */

export interface Cuenta {
  id: string;
  email: string;
  nombre: string;
  plan: string;
  planNombre: string;
  limiteProfesionales: number;
  profesionales: number;
}

export class Nube {
  private token: string | null = null;

  /**
   * @param url dirección de la nube (ej. https://nube.ejemplo.com)
   * @param archivoSesion dónde se guarda el token, cifrado con las credenciales del usuario de Windows
   */
  constructor(private url: string, private archivoSesion: string) {}

  /** Recupera el token guardado de una sesión anterior (se valida contra la nube en `yo`). */
  cargarSesionGuardada() {
    try {
      const cifrado = readFileSync(this.archivoSesion);
      this.token = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(cifrado) : null;
    } catch {
      this.token = null;
    }
  }

  private guardarSesion(token: string) {
    this.token = token;
    // Sin cifrado disponible no se guarda en disco: la próxima vez pide la contraseña.
    if (safeStorage.isEncryptionAvailable()) {
      try { writeFileSync(this.archivoSesion, safeStorage.encryptString(token), { mode: 0o600 }); } catch { /* sigue sin guardar */ }
    }
  }

  private olvidarSesion() {
    this.token = null;
    try { rmSync(this.archivoSesion, { force: true }); } catch { /* nada que borrar */ }
  }

  get conSesion() { return this.token !== null; }

  private async pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.url}/api${ruta}`, {
        method: metodo,
        headers: {
          ...(cuerpo !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new ErrorHttp(0, "No hay conexión con el servidor de cuentas. Revisá tu internet: la aplicación lo necesita para ingresar.");
    }
    if (res.status === 204) return undefined as T;
    const datos = await res.json().catch(() => ({})) as { error?: string };
    if (res.status === 401 && !ruta.startsWith("/auth/login")) this.olvidarSesion();
    if (!res.ok) throw new ErrorHttp(res.status, datos.error ?? "Ocurrió un error inesperado en el servidor de cuentas.");
    return datos as T;
  }

  async ingresar(email: string, password: string): Promise<Cuenta> {
    const r = await this.pedir<{ token: string; cuenta: Cuenta }>("POST", "/auth/login", { email, password });
    this.guardarSesion(r.token);
    return r.cuenta;
  }

  async registrarse(d: { email: string; nombre: string; password: string; aceptaTerminos: boolean }): Promise<Cuenta> {
    const r = await this.pedir<{ token: string; cuenta: Cuenta }>("POST", "/auth/registro", d);
    this.guardarSesion(r.token);
    return r.cuenta;
  }

  /** Verifica la sesión guardada contra la nube. Sin internet, falla. */
  async yo(): Promise<Cuenta> {
    if (!this.token) throw new ErrorHttp(401, "No hay una sesión iniciada.");
    return this.pedir<Cuenta>("GET", "/auth/yo");
  }

  async salir() {
    if (this.token) await this.pedir("POST", "/auth/logout").catch(() => {});
    this.olvidarSesion();
  }

  /** Informa la cantidad de profesionales. Si supera el límite del plan, la nube lo rechaza (403). */
  informarProfesionales(cantidad: number): Promise<Cuenta> {
    return this.pedir<Cuenta>("PUT", "/cuenta/profesionales", { cantidad });
  }
}
