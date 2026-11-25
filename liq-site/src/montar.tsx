import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/archivo/400.css";
import "@fontsource/archivo/500.css";
import "@fontsource/archivo/600.css";
import "@fontsource/archivo/700.css";
import "@fontsource/archivo/800.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./estilos.css";

/** Cada página (.html) llama a esto con su contenido. */
export function montar(pagina: ReactNode) {
  createRoot(document.getElementById("raiz")!).render(<StrictMode>{pagina}</StrictMode>);
}
