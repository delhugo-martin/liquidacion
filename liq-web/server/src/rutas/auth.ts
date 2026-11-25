import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { pool } from "../db.js";
import { cerrarSesion, crearSesion, hashPassword, HASH_RELLENO, verificarPassword } from "../auth.js";
import { esquemas, validar, ErrorHttp } from "../validacion.js";

export const rutasAuth = Router();

// Máximo 10 intentos de ingreso o registro cada 15 minutos por IP.
const limite = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Esperá unos minutos y probá de nuevo." },
});

rutasAuth.post("/registro", limite, async (req, res) => {
  const d = validar(esquemas.registro, req.body);
  const hash = await hashPassword(d.password);
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO usuarios (email, nombre, password_hash, acepto_terminos)
     VALUES ($1, $2, $3, now())
     ON CONFLICT DO NOTHING RETURNING id`,
    [d.email, d.nombre, hash],
  );
  if (!rows[0]) throw new ErrorHttp(409, "Ya existe una cuenta con ese email. Probá ingresar.");
  await crearSesion(res, rows[0].id);
  res.status(201).json({ id: rows[0].id, email: d.email, nombre: d.nombre });
});

rutasAuth.post("/login", limite, async (req, res) => {
  const d = validar(esquemas.login, req.body);
  const { rows } = await pool.query<{ id: string; email: string; nombre: string; password_hash: string }>(
    "SELECT id, email, nombre, password_hash FROM usuarios WHERE lower(email) = $1",
    [d.email],
  );
  const u = rows[0];
  const ok = await verificarPassword(d.password, u?.password_hash ?? HASH_RELLENO);
  if (!u || !ok) throw new ErrorHttp(401, "El email o la contraseña no son correctos.");
  await crearSesion(res, u.id);
  res.json({ id: u.id, email: u.email, nombre: u.nombre });
});

rutasAuth.post("/logout", async (req, res) => {
  await cerrarSesion(req, res);
  res.status(204).end();
});

rutasAuth.get("/yo", (req, res) => {
  if (!req.usuario) {
    res.status(401).json({ error: "No hay una sesión iniciada." });
    return;
  }
  res.json(req.usuario);
});
