import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response, NextFunction } from "express";
import { pool } from "./db.js";
import { config } from "./config.js";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, keylen: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export const COOKIE = "sid";

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
}

declare module "express-serve-static-core" {
  interface Request {
    usuario?: Usuario;
  }
}

// ---------- Contraseñas (scrypt, sin dependencias nativas) ----------

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64, SCRYPT);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verificarPassword(password: string, guardado: string): Promise<boolean> {
  const [alg, saltB64, hashB64] = guardado.split("$");
  if (alg !== "scrypt" || !saltB64 || !hashB64) return false;
  const esperado = Buffer.from(hashB64, "base64");
  const hash = await scryptAsync(password, Buffer.from(saltB64, "base64"), esperado.length, SCRYPT);
  return timingSafeEqual(hash, esperado);
}

// Hash de relleno para que un email inexistente tarde lo mismo que uno existente.
export const HASH_RELLENO = await hashPassword(randomBytes(16).toString("hex"));

// ---------- Sesiones ----------
// El navegador guarda un token aleatorio en una cookie httpOnly; la base guarda solo su hash.

const hashToken = (token: string) => createHash("sha256").update(token).digest();

export async function crearSesion(res: Response, usuarioId: string) {
  const token = randomBytes(32).toString("base64url");
  const expira = new Date(Date.now() + config.duracionSesionMs);
  await pool.query("INSERT INTO sesiones (token_hash, usuario_id, expira) VALUES ($1, $2, $3)", [
    hashToken(token),
    usuarioId,
    expira,
  ]);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: config.produccion,
    sameSite: "lax",
    expires: expira,
    path: "/",
  });
}

export async function cerrarSesion(req: Request, res: Response) {
  const token = req.cookies?.[COOKIE];
  if (typeof token === "string") {
    await pool.query("DELETE FROM sesiones WHERE token_hash = $1", [hashToken(token)]);
  }
  res.clearCookie(COOKIE, { path: "/" });
}

/** Carga req.usuario si la cookie corresponde a una sesión vigente. */
export async function cargarUsuario(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE];
  if (typeof token === "string" && token.length > 0) {
    const { rows } = await pool.query<Usuario>(
      `SELECT u.id, u.email, u.nombre
         FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.token_hash = $1 AND s.expira > now()`,
      [hashToken(token)],
    );
    if (rows[0]) req.usuario = rows[0];
  }
  next();
}

export function requiereSesion(req: Request, res: Response, next: NextFunction) {
  if (!req.usuario) {
    res.status(401).json({ error: "Tu sesión expiró. Volvé a ingresar." });
    return;
  }
  next();
}

/** Bloquea pedidos que modifican datos si vienen de otro sitio (protección CSRF). */
export function mismoOrigen(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origen = req.get("origin");
  if (origen && origen !== config.appOrigin) {
    res.status(403).json({ error: "Pedido rechazado: origen no permitido." });
    return;
  }
  if (!req.is("application/json") && req.headers["content-length"] && req.headers["content-length"] !== "0") {
    res.status(415).json({ error: "El pedido tiene que enviarse como JSON." });
    return;
  }
  next();
}

/** Borra sesiones vencidas cada hora. */
export function limpiarSesionesPeriodicamente() {
  const limpiar = () => pool.query("DELETE FROM sesiones WHERE expira < now()").catch(() => {});
  limpiar();
  return setInterval(limpiar, 60 * 60 * 1000).unref();
}
