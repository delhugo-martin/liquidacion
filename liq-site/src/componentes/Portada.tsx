import { DESCARGA_WINDOWS, PLANES } from "../config";
import { Icono } from "./Icono";

export function Portada() {
  const prueba = PLANES.find((p) => p.precioMensual === null);
  return (
    <section className="portada">
      <div className="envoltura">
        <div>
          <span className="etiqueta">Para facturistas de profesionales de la salud</span>
          <h1>La liquidación de tus médicos, ordenada y lista para presentar.</h1>
          <p className="bajada">
            Cargá consultas y prácticas por obra social, con los aranceles siempre al día, y exportá la planilla en
            Excel con un clic. Los datos de los pacientes quedan en tu computadora, no en internet.
          </p>
          <div className="acciones" id="descargar">
            <a className="btn primario" href={DESCARGA_WINDOWS} download>
              <Icono nombre="descargar" />
              Descargar para Windows
            </a>
            <a className="btn secundario" href="#contacto">Hablar con nosotros</a>
          </div>
          <p className="nota-accion">
            {prueba && `Gratis para probar con ${prueba.profesionales === 1 ? "un profesional" : `${prueba.profesionales} profesionales`}. `}
            Windows 10 u 11.
          </p>
        </div>
        <VistaApp />
      </div>
    </section>
  );
}

// ---------- Maqueta de la pantalla principal de la app (datos inventados) ----------

type Fila = { fecha: string; paciente: string; detalle: string; monto: number };

const CONSULTAS: Fila[] = [
  { fecha: "03/11/26", paciente: "GARCÍA, ANA", detalle: "420101", monto: 18500 },
  { fecha: "03/11/26", paciente: "PÉREZ, MARIO", detalle: "420101", monto: 18500 },
  { fecha: "10/11/26", paciente: "RUIZ, CARLA", detalle: "420101", monto: 18500 },
];
const PRACTICAS: Fila[] = [
  { fecha: "05/11/26", paciente: "LÓPEZ, JUAN", detalle: "2,5 UB", monto: 12000 },
  { fecha: "12/11/26", paciente: "DÍAZ, ELENA", detalle: "6 UB", monto: 28800 },
];
const OBRAS = [["OSDE", 5], ["IOMA", 12], ["PAMI", 8], ["SANCOR", 3]] as const;

const montoApp = (n: number) =>
  `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Tabla({ titulo, filas }: { titulo: string; filas: Fila[] }) {
  return (
    <div>
      <div className="v-seccion">{titulo}</div>
      <table className="v-tabla">
        <tbody>
          {filas.map((f) => (
            <tr key={f.paciente}>
              <td className="num tenue">{f.fecha}</td>
              <td>{f.paciente}</td>
              <td className="num tenue ocultable">{f.detalle}</td>
              <td className="num">{montoApp(f.monto)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VistaApp() {
  const total = [...CONSULTAS, ...PRACTICAS].reduce((s, f) => s + f.monto, 0);
  return (
    <figure className="ventana" aria-label="Así se ve la aplicación: prestaciones de una obra social con el total a facturar" style={{ margin: 0 }}>
      <div className="titulo-v" aria-hidden="true">
        <span>Liquidación</span>
        <span className="controles"><span>—</span><span>▢</span><span>✕</span></span>
      </div>
      <div className="cuerpo" aria-hidden="true">
        <div className="v-enc">
          <div>
            <div className="v-eyebrow">Facturación por obra social</div>
            <div className="v-prof">DRA. LAURA SOSA</div>
          </div>
          <div className="v-plan">Del <span className="num">01/11/26</span> al <span className="num">30/11/26</span></div>
        </div>
        <div className="v-obras">
          {OBRAS.map(([nombre, n], i) => <span key={nombre} className={i === 0 ? "activa" : undefined}>{nombre} · {n}</span>)}
        </div>
        <Tabla titulo="CONSULTAS" filas={CONSULTAS} />
        <Tabla titulo="PRÁCTICAS" filas={PRACTICAS} />
        <div className="v-total"><span>Total a facturar</span><span className="num">{montoApp(total)}</span></div>
      </div>
    </figure>
  );
}
