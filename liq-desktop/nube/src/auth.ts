import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response, NextFunction } from "express";
import { pool } from "./db.js";
import { config } from "./config.js";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, keylen: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** Lo que la app de escritorio necesita saber de la cuenta. */
export interface Cuenta {
  id: string;
  email: string;
  nombre: string;
  plan: string;
  planNombre: string;
  limiteProfesionales: number;
  profesionales: number;
}

declare module "express-serve-static-core" {
  interface Request {
    cuenta?: Cuenta;
  }
}

export const SELECT_CUENTA = `
  SELECT u.id, u.email, u.nombre, u.plan, p.nombre AS "planNombre",
         p.limite_profesionales AS "limiteProfesionales", u.profesionales
    FROM usuarios u JOIN planes p ON p.id = u.plan`;

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
// La app de escritorio no es un navegador: en vez de cookies usa un token en la cabecera
// "Authorization: Bearer <token>". La base guarda solo el hash del token.

const hashToken = (token: string) => createHash("sha256").update(token).digest();

/** Crea una sesión y devuelve el token (se entrega una sola vez, a la app). */
export async function crearSesion(usuarioId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expira = new Date(Date.now() + config.duracionSesionMs);
  await pool.query("INSERT INTO sesiones (token_hash, usuario_id, expira) VALUES ($1, $2, $3)", [
    hashToken(token),
    usuarioId,
    expira,
  ]);
  return token;
}

const tokenDe = (req: Request) => {
  const h = req.get("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
};

export async function cerrarSesion(req: Request) {
  const token = tokenDe(req);
  if (token) await pool.query("DELETE FROM sesiones WHERE token_hash = $1", [hashToken(token)]);
}

/** Carga req.cuenta si el token corresponde a una sesión vigente. */
export async function cargarCuenta(req: Request, _res: Response, next: NextFunction) {
  const token = tokenDe(req);
  if (token) {
    const { rows } = await pool.query<Cuenta>(
      `${SELECT_CUENTA} JOIN sesiones s ON s.usuario_id = u.id WHERE s.token_hash = $1 AND s.expira > now()`,
      [hashToken(token)],
    );
    if (rows[0]) req.cuenta = rows[0];
  }
  next();
}

export function requiereSesion(req: Request, res: Response, next: NextFunction) {
  if (!req.cuenta) {
    res.status(401).json({ error: "Tu sesión expiró. Volvé a ingresar." });
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
