import { contextBridge, ipcRenderer } from "electron";

// Lo único que la interfaz puede pedirle a la app: no tiene acceso a archivos, a Node ni a la red.
contextBridge.exposeInMainWorld("liq", {
  pedir: (metodo: string, ruta: string, cuerpo?: unknown) => ipcRenderer.invoke("liq:pedir", metodo, ruta, cuerpo),
  exportar: (osId: string, query: Record<string, string>, formato: "csv" | "xlsx") =>
    ipcRenderer.invoke("liq:exportar", osId, query, formato),
  carpetaDatos: (): Promise<string | null> => ipcRenderer.invoke("liq:carpeta-datos"),
});
