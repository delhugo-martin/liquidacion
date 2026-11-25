import type { ReactNode } from "react";
import { Icono } from "./Icono";

/** Encabezado fijo arriba. En la página de inicio muestra las secciones; en las legales, "Volver al inicio". */
export function Barra({ inicio = false }: { inicio?: boolean }) {
  return (
    <header className="barra">
      <div className="envoltura">
        <a className="marca" href={inicio ? "#" : "index.html"} aria-label="Liquidación, inicio">
          <span className="logo"><Icono nombre="logo" grosor={2.4} /></span>
          Liquidación
        </a>
        {inicio ? (
          <>
            <nav aria-label="Secciones">
              <a href="#funciones">Qué hace</a>
              <a href="#privacidad">Tus datos</a>
              <a href="#planes">Planes</a>
              <a href="#preguntas">Preguntas</a>
              <a href="#contacto">Contacto</a>
            </nav>
            <a className="btn primario chico" href="#descargar">Descargar</a>
          </>
        ) : (
          <a className="btn secundario chico" href="index.html" style={{ marginLeft: "auto" }}>Volver al inicio</a>
        )}
      </div>
    </header>
  );
}

export function Pie() {
  return (
    <footer className="pie">
      <div className="envoltura">
        <span>© {new Date().getFullYear()} Liquidación</span>
        <nav aria-label="Legales">
          <a href="terminos.html">Términos y condiciones</a>
          <a href="privacidad.html">Política de privacidad</a>
        </nav>
      </div>
    </footer>
  );
}

/** Página legal: barra, aviso de borrador, título y contenido. */
export function PaginaLegal({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <>
      <Barra />
      <main className="legal">
        <p className="borrador">
          <strong>BORRADOR.</strong> Este texto es un punto de partida y tiene que revisarlo un abogado antes de
          publicar el sitio. Completá lo que está entre corchetes.
        </p>
        <h1>{titulo}</h1>
        <p className="actualizado">Última actualización: [FECHA]</p>
        {children}
      </main>
      <Pie />
    </>
  );
}
