import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { config } from "./config.js";
import { cargarUsuario, limpiarSesionesPeriodicamente, mismoOrigen, requiereSesion } from "./auth.js";
import { rutasAuth } from "./rutas/auth.js";
import { rutasDatos } from "./rutas/datos.js";
import { ErrorHttp } from "./validacion.js";

const app = express();
app.set("trust proxy", config.proxies); // ver TRUST_PROXY en .env.example
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

const api = express.Router();
api.use((_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
api.use(mismoOrigen);
api.use(cargarUsuario);
api.use("/auth", rutasAuth);
api.use(requiereSesion, rutasDatos);
api.use((_req, res) => { res.status(404).json({ error: "Ruta inexistente." }); });
app.use("/api", api);

// En producción el mismo servidor entrega el frontend compilado (web/dist).
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/dist");
if (config.produccion && existsSync(web)) {
  app.use(express.static(web, { index: false, maxAge: "1h" }));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(web, "index.html")));
}

// Errores: mensajes claros para el usuario, detalles solo en el log del servidor.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ErrorHttp) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  const codigo = (err as { code?: string })?.code;
  if (codigo === "23505") {
    res.status(409).json({ error: "Ya existe un registro con ese nombre o código." });
    return;
  }
  if ((err as { type?: string })?.type === "entity.parse.failed") {
    res.status(400).json({ error: "El pedido no es un JSON válido." });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Ocurrió un error en el servidor. Probá de nuevo en un momento." });
});

app.listen(config.port, () => {
  console.log(`API escuchando en http://localhost:${config.port}`);
  limpiarSesionesPeriodicamente();
});
