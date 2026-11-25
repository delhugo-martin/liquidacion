import { useEffect, useRef, useState } from "react";
import { isoATexto, textoAFecha } from "../formato";

/**
 * Campo de fecha que siempre se muestra como dd/mm/aa, sin importar el idioma del navegador
 * (el <input type="date"> nativo usa el del navegador y puede mostrar mm/dd/aaaa).
 * `value` y `onChange` usan el formato AAAA-MM-DD, igual que antes. El botón abre el calendario nativo.
 */
export function CampoFecha({ id, value, onChange, required }: {
  id: string; value: string; onChange: (iso: string) => void; required?: boolean;
}) {
  const [texto, setTexto] = useState(() => isoATexto(value));
  const refTexto = useRef<HTMLInputElement>(null);
  const refCalendario = useRef<HTMLInputElement>(null);

  // Si la fecha cambia desde afuera (Ver todo, editar otra prestación, etc.), mostrarla.
  useEffect(() => {
    if (textoAFecha(texto) !== value) setTexto(isoATexto(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const marcarValidez = (t: string) => {
    const ok = t === "" ? !required : textoAFecha(t) !== null;
    refTexto.current?.setCustomValidity(ok ? "" : t === "" ? "Falta la fecha." : "Fecha inválida. Usá dd/mm/aa.");
  };

  const escribir = (crudo: string) => {
    // Solo dígitos, y las barras se ponen solas: 191126 -> 19/11/26
    const d = crudo.replace(/\D/g, "").slice(0, 6);
    const t = [d.slice(0, 2), d.slice(2, 4), d.slice(4, 6)].filter(Boolean).join("/");
    const nuevo = t;
    setTexto(nuevo);
    marcarValidez(nuevo);
    if (nuevo === "") onChange("");
    else {
      const iso = textoAFecha(nuevo);
      if (iso) onChange(iso);
    }
  };

  const alSalir = () => {
    // Si quedó a medias, volver a la última fecha válida
    if (texto !== "" && !textoAFecha(texto)) { setTexto(isoATexto(value)); marcarValidez(isoATexto(value)); }
  };

  const abrirCalendario = () => {
    const c = refCalendario.current;
    if (!c) return;
    try { c.showPicker(); } catch { c.focus(); }
  };

  return (
    <div className="campo-fecha">
      <input id={id} ref={refTexto} className="num" inputMode="numeric" placeholder="dd/mm/aa" value={texto}
        onChange={(e) => escribir(e.target.value)} onBlur={alSalir} required={required} />
      <button type="button" className="campo-fecha-btn" onClick={abrirCalendario} aria-label="Elegir en el calendario" tabIndex={-1}>
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4">
          <rect x="2" y="3" width="12" height="11" rx="1.5" /><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" />
        </svg>
      </button>
      <input ref={refCalendario} type="date" className="campo-fecha-nativo" tabIndex={-1} aria-hidden="true"
        value={value} onChange={(e) => {
          const iso = e.target.value;
          if (!iso) return;
          setTexto(isoATexto(iso)); refTexto.current?.setCustomValidity(""); onChange(iso);
        }} />
    </div>
  );
}
