import { useEffect, useState } from "react";

/** Botón de borrar que pide un segundo clic para confirmar (se cancela solo a los 4 segundos). */
export function BotonConfirmar({ texto = "Borrar", confirmar = "Confirmar", onConfirmar }: {
  texto?: string; confirmar?: string; onConfirmar: () => void;
}) {
  const [armado, setArmado] = useState(false);
  useEffect(() => {
    if (!armado) return;
    const t = setTimeout(() => setArmado(false), 4000);
    return () => clearTimeout(t);
  }, [armado]);

  return armado ? (
    <button type="button" className="btn peligro-lleno" onClick={() => { setArmado(false); onConfirmar(); }}>{confirmar}</button>
  ) : (
    <button type="button" className="btn fantasma peligro" onClick={() => setArmado(true)}>{texto}</button>
  );
}
