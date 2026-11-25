import { useEffect, useState } from "react";

/** Muestra los mensajes enviados con avisar() durante unos segundos. */
export function Aviso() {
  const [texto, setTexto] = useState("");

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const escuchar = (e: Event) => {
      setTexto((e as CustomEvent<string>).detail);
      clearTimeout(t);
      t = setTimeout(() => setTexto(""), 3000);
    };
    window.addEventListener("aviso", escuchar);
    return () => { window.removeEventListener("aviso", escuchar); clearTimeout(t); };
  }, []);

  return texto ? <div className="aviso" role="status">{texto}</div> : null;
}
