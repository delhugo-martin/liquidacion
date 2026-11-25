import { app, BrowserWindow, dialog, ipcMain, Menu, type IpcMainInvokeEvent } from "electron";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { abrirBase, type Base } from "./base.js";
import { atender } from "./rutas.js";
import { armarExportacion } from "./exportar.js";
import { ErrorHttp } from "./validacion.js";

// Versión SOLO ESCRITORIO (para pruebas): no hay cuenta ni servidor. La app abre directo y guarda todo en
// una base SQLite en la PC: <datos de la app>/datos/local.sqlite. No usa internet para nada.

const DEV_URL = app.isPackaged ? undefined : process.env.LIQ_DEV_URL; // servidor de Vite en `npm run dev`

if (!app.requestSingleInstanceLock()) app.exit(0);

let ventana: BrowserWindow | null = null;
let base: Base | null = null;

const carpetaDatos = () => path.join(app.getPath("userData"), "datos");

/** Solo se aceptan pedidos de la ventana de la app. */
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
  if (!deLaApp(e) || typeof metodo !== "string" || typeof ruta !== "string" || !base) throw new ErrorHttp(403, "Pedido no permitido.");
  return atender(base, metodo, ruta, cuerpo);
}));

ipcMain.handle("liq:exportar", (e, osId: unknown, query: unknown, formato: unknown) => responder(async () => {
  if (!deLaApp(e) || !base || typeof osId !== "string" || (formato !== "csv" && formato !== "xlsx") ||
      typeof query !== "object" || query === null) throw new ErrorHttp(403, "Pedido no permitido.");
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

/** Dónde están los datos (se muestra en la pantalla para poder copiarlos o hacer una copia de seguridad). */
ipcMain.handle("liq:carpeta-datos", (e) => (deLaApp(e) ? path.join(carpetaDatos(), "local.sqlite") : null));

// ---------- Ventana ----------

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

  // La ventana nunca navega a otro lado ni abre ventanas nuevas.
  ventana.webContents.on("will-navigate", (e) => e.preventDefault());
  ventana.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  if (DEV_URL) ventana.loadURL(DEV_URL);
  else ventana.loadFile(path.join(__dirname, "../renderer/index.html"));
  ventana.on("closed", () => { ventana = null; });
}

app.on("second-instance", () => {
  if (ventana) { if (ventana.isMinimized()) ventana.restore(); ventana.focus(); }
});

app.whenReady().then(() => {
  if (!DEV_URL) Menu.setApplicationMenu(null);
  base = abrirBase(carpetaDatos());
  crearVentana();
});

app.on("window-all-closed", () => {
  base?.close();
  base = null;
  app.quit();
});
