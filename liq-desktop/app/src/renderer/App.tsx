import { useEffect, useState } from "react";
import { api, onSesionExpirada } from "./api";
import type { Usuario } from "./tipos";
import { Ingreso } from "./Ingreso";
import { Facturacion } from "./Facturacion";
import { Aviso } from "./componentes/Aviso";
import { avisar } from "./formato";

export function App() {
  // undefined = todavía no sabemos; null = sin sesión
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);

  useEffect(() => {
    onSesionExpirada(() => {
      setUsuario(null);
      avisar("Tu sesión expiró. Volvé a ingresar.");
    });
    // Siempre se valida la cuenta contra la nube: sin internet no se puede entrar.
    api.yo().then(setUsuario, (err) => {
      setUsuario(null);
      if (err?.status === 0) avisar(err.message);
    });
  }, []);

  const salir = async () => {
    await api.salir().catch(() => {});
    setUsuario(null);
  };

  return (
    <>
      {usuario === undefined ? (
        <div className="cargando">Cargando…</div>
      ) : usuario === null ? (
        <Ingreso onIngreso={setUsuario} />
      ) : (
        <Facturacion usuario={usuario} onSalir={salir} />
      )}
      <Aviso />
    </>
  );
}
