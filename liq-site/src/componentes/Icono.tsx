// Íconos de trazo simples, en línea (sin librerías). Todos son decorativos: aria-hidden.

const TRAZOS = {
  logo: <><path d="M7 4v16h11" /><path d="M11 13l3 3 5-7" /></>,
  descargar: <><path d="M12 4v11" /><path d="M7 10l5 5 5-5" /><path d="M5 20h14" /></>,
  calculadora: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h6" /><path d="M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" /></>,
  buscarPersona: <><circle cx="10" cy="8" r="4" /><path d="M3 20c0-3.3 3.1-6 7-6" /><circle cx="17" cy="17" r="3" /><path d="M21 21l-1.8-1.8" /></>,
  planilla: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M10 4v16" /></>,
  calendario: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  personas: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.1.6 3.5 2.9 3.5 6" /></>,
  historial: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></>,
  pc: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>,
  nube: <path d="M7 18a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.5A3.75 3.75 0 0 1 17.5 18z" />,
  flecha: <path d="M4 12h16M15 7l5 5-5 5" />,
  tilde: <path d="M5 12l5 5 9-10" />,
  chat: <path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z" />,
  email: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
};

export type NombreIcono = keyof typeof TRAZOS;

export function Icono({ nombre, grosor = 2 }: { nombre: NombreIcono; grosor?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={grosor}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRAZOS[nombre]}
    </svg>
  );
}
