import { Router } from "express";
import { pool } from "../db.js";
import { esquemas, validar, ErrorHttp } from "../validacion.js";

export const rutasCuenta = Router();

/**
 * La app informa cuántos profesionales tiene cargados en la PC.
 * Antes de agregar uno manda la cantidad nueva: si supera el límite del plan, se rechaza y no se agrega.
 * Al borrar uno manda la cantidad nueva (bajar nunca se rechaza).
 */
rutasCuenta.put("/cuenta/profesionales", async (req, res) => {
  const { cantidad } = validar(esquemas.cantidadProfesionales, req.body);
  const cuenta = req.cuenta!;
  if (cantidad > cuenta.profesionales && cantidad > cuenta.limiteProfesionales) {
    throw new ErrorHttp(403,
      `Tu plan ${cuenta.planNombre} permite hasta ${cuenta.limiteProfesionales} ` +
      `${cuenta.limiteProfesionales === 1 ? "profesional" : "profesionales"}. Para agregar más, cambiá de plan.`);
  }
  await pool.query("UPDATE usuarios SET profesionales = $2 WHERE id = $1", [cuenta.id, cantidad]);
  res.json({ ...cuenta, profesionales: cantidad });
});
