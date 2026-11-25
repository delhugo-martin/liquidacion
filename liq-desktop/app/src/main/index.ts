import { app, BrowserWindow, dialog, ipcMain, Menu, shell, type IpcMainInvokeEvent } from "electron";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { abrirBase, type Base } from "./base.js";
import { Nube, type Cuenta } from "./nube.js";
import { atender } from "./rutas.js";
import { armarExportacion } from "./exportar.js";
import { ErrorHttp, esquemas, validar } from "./validacion.js";

// ---------- Configuración ----------

/** Dirección de la nube de cuentas. Para desarrollo: LIQ_NUBE_URL=http://localhost:3100 */
const NUBE_URL = (process.env.LIQ_NUBE_URL ?? "https://CAMBIAR-por-la-direccion-de-la-nube").replace(/\/+$/, "");
const DEV_URL = app.isPackaged ? undefined : process.env.LIQ_DEV_URL; // servidor de Vite en `npm run dev`

// La contraseña viaja a la nube: en la app instalada solo se permite HTTPS.
if (app.isPackaged && !NUBE_URL.startsWith("https://")) {
  dialog.showErrorBox("Configuración inválida", "La dirección del servidor de cuentas tiene que empezar con https://");
  app.exit(1);
}

if (!app.requestSingleInstanceLock()) app.exit(0);

const nube = new Nube(NUBE_URL, path.join(app.getPath("userData"), "sesion.bin"));
let ventana: BrowserWindow | null = null;
let base: Base | null = null;
let cuenta: Cuenta | null = null;

// ---------- Sesión: la nube dice quién es, la base local se abre con su id ----------

function abrirCuenta(c: Cuenta) {
  if (cuenta?.id !== c.id) {
    base?.close();
    base = abrirBase(path.join(app.getPath("userData"), "datos"), c.id);
  }
  cuenta = c;
  return c;
}

function cerrarCuenta() {
  base?.close();
  base = null;
  cuenta = null;
}

async function atenderAuth(metodo: string, ruta: string, cuerpo: unknown) {
  if (metodo === "GET" && ruta === "/auth/yo") {
    try { return abrirCuenta(await nube.yo()); }
    catch (err) { if ((err as ErrorHttp).status === 401) cerrarCuenta(); throw err; }
  }
  if (metodo === "POST" && ruta === "/auth/login") {
    const d = validar(esquemas.login, cuerpo);
    return abrirCuenta(await nube.ingresar(d.email, d.password));
  }
  if (metodo === "POST" && ruta === "/auth/registro") {
    return abrirCuenta(await nube.registrarse(validar(esquemas.registro, cuerpo)));
  }
  if (metodo === "POST" && ruta === "/auth/logout") {
    await nube.salir();
    cerrarCuenta();
    return undefined;
  }
  throw new ErrorHttp(404, "Ruta inexistente.");
}

/** Solo se aceptan pedidos de la ventana de la app (no de otras páginas que se pudieran abrir). */
function deLaApp(e: IpcMainInvokeEvent) {
  return ventana !== null && e.sender === ventana.webContents && e.senderFrame === ventana.webContents.mainFrame;
}

type Respuesta = { ok: true; datos: unknown } | { ok: false; status: number; error: string };

async function responder(fn: () => Promise<unknown>): Promise<Respuesta> {
  try {
    return { ok: true, datos: await fn() };
  } catch (err) {
    if (err instanceof ErrorHttp) return { ok: false, status: err.status, error: err.message };
    console.error(err);
    return { ok: false, status: 500, error: "Ocurrió un error inesperado. Probá de nuevo." };
  }
}

ipcMain.handle("liq:pedir", (e, metodo: unknown, ruta: unknown, cuerpo: unknown) => responder(async () => {
  if (!deLaApp(e) || typeof metodo !== "string" || typeof ruta !== "string") throw new ErrorHttp(403, "Pedido no permitido.");
  if (ruta.startsWith("/auth/")) return atenderAuth(metodo, ruta, cuerpo);
  if (!base || !cuenta) throw new ErrorHttp(401, "Tu sesión expiró. Volvé a ingresar.");
  return atender(base, nube, metodo, ruta, cuerpo);
}));

ipcMain.handle("liq:exportar", (e, osId: unknown, query: unknown, formato: unknown) => responder(async () => {
  if (!deLaApp(e) || typeof osId !== "string" || (formato !== "csv" && formato !== "xlsx") ||
      typeof query !== "object" || query === null) throw new ErrorHttp(403, "Pedido no permitido.");
  if (!base) throw new ErrorHttp(401, "Tu sesión expiró. Volvé a ingresar.");
  const { archivo, contenido } = await armarExportacion(base, osId, query as Record<string, string>, formato);
  const r = await dialog.showSaveDialog(ventana!, {
    title: "Guardar planilla",
    defaultPath: path.join(app.getPath("documents"), archivo),
    filters: formato === "xlsx" ? [{ name: "Excel", extensions: ["xlsx"] }] : [{ name: "CSV", extensions: ["csv"] }],
  });
  if (r.canceled || !r.filePath) return { guardado: null };
  await writeFile(r.filePath, contenido);
  return { guardado: r.filePath };
}));

// Cada 10 minutos se confirma con la nube que la cuenta sigue habilitada (por ejemplo, si se dio de baja).
setInterval(async () => {
  if (!cuenta) return;
  try { abrirCuenta(await nube.yo()); }
  catch (err) {
    if ((err as ErrorHttp).status === 401) { cerrarCuenta(); ventana?.webContents.send("liq:sesion-expirada"); }
  }
}, 10 * 60 * 1000).unref();

// ---------- Ventana ----------

const PAGINAS_LEGALES = /\/(terminos|privacidad)\.html$/;

function crearVentana() {
  ventana = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: "Liquidación",
    backgroundColor: "#f6f4f2",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  ventana.once("ready-to-show", () => ventana?.show());

  // La ventana nunca navega a otro lado. Términos y privacidad se abren en una ventana aparte, sin acceso a la app;
  // cualquier enlace web se abre en el navegador.
  ventana.webContents.on("will-navigate", (e) => e.preventDefault());
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    const u = new URL(url);
    if (PAGINAS_LEGALES.test(u.pathname) && (u.protocol === "file:" || (DEV_URL && url.startsWith(DEV_URL)))) {
      return { action: "allow", overrideBrowserWindowOptions: { width: 800, height: 700, autoHideMenuBar: true, webPreferences: { sandbox: true } } };
    }
    if (u.protocol === "https:") shell.openExternal(url);
    return { action: "deny" };
  });

  if (DEV_URL) ventana.loadURL(DEV_URL);
  else ventana.loadFile(path.join(__dirname, "../renderer/index.html"));
  ventana.on("closed", () => { ventana = null; });
}

app.on("second-instance", () => {
  if (ventana) { if (ventana.isMinimized()) ventana.restore(); ventana.focus(); }
});

app.whenReady().then(() => {
  if (!DEV_URL) Menu.setApplicationMenu(null);
  nube.cargarSesionGuardada();
  crearVentana();
});

app.on("window-all-closed", () => {
  cerrarCuenta();
  app.quit();
});
