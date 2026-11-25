import { useRef, useState, type KeyboardEvent } from "react";
import { api } from "../api";
import type { ObraSocial } from "../tipos";
import { avisar, mensajeDe } from "../formato";

/** Pestañas de obras sociales (como las hojas del Excel) y alta de una nueva. */
export function ObrasSociales({ profesionalId, obras, seleccionada, onSeleccionar, onCambio }: {
  profesionalId: string;
  obras: ObraSocial[];
  seleccionada: string;
  onSeleccionar: (id: string) => void;
  onCambio: (nuevaId?: string) => void;
}) {
  const [agregando, setAgregando] = useState(false);
  const [nombre, setNombre] = useState("");

  const enviando = useRef(false);

  const crear = async () => {
    const n = nombre.trim();
    if (!n) { setAgregando(false); return; }
    if (enviando.current) return; // Enter y la pérdida de foco pueden llegar juntos
    enviando.current = true;
    try {
      const os = await api.crearObraSocial(profesionalId, n);
      avisar("Obra social agregada");
      setNombre(""); setAgregando(false);
      onCambio(os.id);
    } catch (err) { avisar(mensajeDe(err)); } finally { enviando.current = false; }
  };

  const teclas = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); crear(); }
    if (e.key === "Escape") { setNombre(""); setAgregando(false); }
  };

  return (
    <nav className="pestanas" role="tablist" aria-label="Obras sociales">
      {obras.map((o) => (
        <button key={o.id} role="tab" aria-selected={o.id === seleccionada} className="pestana" onClick={() => onSeleccionar(o.id)}>
          {o.nombre}<span className="n">{o.cantidad}</span>
        </button>
      ))}
      {agregando ? (
        <input autoFocus className="nueva-os" value={nombre} onChange={(e) => setNombre(e.target.value)}
          onKeyDown={teclas} onBlur={crear} placeholder="Nombre y Enter" aria-label="Nombre de la obra social" />
      ) : (
        <button className="pestana agregar" onClick={() => setAgregando(true)}>+ Obra social</button>
      )}
    </nav>
  );
}
