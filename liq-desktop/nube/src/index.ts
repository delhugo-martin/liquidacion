import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { cargarCuenta, limpiarSesionesPeriodicamente, requiereSesion } from "./auth.js";
import { rutasAuth } from "./rutas/auth.js";
import { rutasCuenta } from "./rutas/cuenta.js";
import { ErrorHttp } from "./validacion.js";

// Nube de la versión escritorio: solo cuentas, planes y cantidad de profesionales.
// No guarda ningún dato de pacientes ni prestaciones.
const app = express();
app.set("trust proxy", config.proxies); // ver TRUST_PROXY en .env.example
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "10kb" }));

const api = express.Router();
api.use((_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
api.use(cargarCuenta);
api.use("/auth", rutasAuth);
api.use(requiereSesion, rutasCuenta);
api.use((_req, res) => { res.status(404).json({ error: "Ruta inexistente." }); });
app.use("/api", api);

// Errores: mensajes claros para el usuario, detalles solo en el log del servidor.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ErrorHttp) {
    res.status(err.status).json({ error: err.message });
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
  console.log(`Nube escuchando en http://localhost:${config.port}`);
  limpiarSesionesPeriodicamente();
});
