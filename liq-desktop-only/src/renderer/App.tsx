import { Facturacion } from "./Facturacion";
import { Aviso } from "./componentes/Aviso";

// Versión solo escritorio: no hay inicio de sesión, la app abre directo.
export function App() {
  return (
    <>
      <Facturacion />
      <Aviso />
    </>
  );
}
