import { montar } from "../montar";
import { Barra, Pie } from "../componentes/Marco";
import { Portada } from "../componentes/Portada";
import { Contacto, Funciones, Pasos, Planes, Preguntas, TusDatos } from "../componentes/Secciones";

montar(
  <>
    <a className="saltar" href="#contenido">Ir al contenido</a>
    <Barra inicio />
    <main id="contenido">
      <Portada />
      <Funciones />
      <TusDatos />
      <Pasos />
      <Planes />
      <Preguntas />
      <Contacto />
    </main>
    <Pie />
  </>,
);
