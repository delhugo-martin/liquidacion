import type { ReactNode } from "react";
import { enlaceEmail, enlaceWhatsApp, PLANES, pesos } from "../config";
import { Icono, type NombreIcono } from "./Icono";

function Encabezado({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="encabezado-s">
      <h2>{titulo}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}

// ---------- Qué hace ----------

const FUNCIONES: { icono: NombreIcono; titulo: string; texto: string }[] = [
  { icono: "calculadora", titulo: "Aranceles por monto o por unidad",
    texto: "Cargá el valor de la UB (o la unidad que use cada obra social) y los aranceles se recalculan solos cuando cambia." },
  { icono: "buscarPersona", titulo: "Pacientes que se completan solos",
    texto: "Escribís el número de afiliado o el apellido y te sugiere el resto: nombre, plan y marca de la última vez." },
  { icono: "planilla", titulo: "Planilla lista para presentar",
    texto: "Excel con Consultas y Prácticas en tablas separadas, subtotales y total a facturar. También en CSV, con el nombre que elijas." },
  { icono: "calendario", titulo: "Por período, al instante",
    texto: "Elegís desde y hasta qué fecha y ves cuántas prestaciones hay y cuánto suman. Fechas en dd/mm/aa, como siempre." },
  { icono: "personas", titulo: "Varios médicos, cada uno con lo suyo",
    texto: "Cada profesional tiene sus obras sociales, sus unidades y sus aranceles. Pasás de uno a otro sin mezclar nada." },
  { icono: "historial", titulo: "Historial de cambios",
    texto: "Cada alta, cambio o baja de prestaciones y aranceles queda registrada, y ese registro no se puede borrar." },
];

export function Funciones() {
  return (
    <section className="seccion alterna" id="funciones">
      <div className="envoltura">
        <Encabezado titulo="Todo lo que hacías en la planilla, sin las fórmulas rotas.">
          Pensado a partir de cómo trabaja un facturista: varios médicos, muchas obras sociales y aranceles que cambian seguido.
        </Encabezado>
        <div className="funciones">
          {FUNCIONES.map((f) => (
            <article className="funcion" key={f.titulo}>
              <div className="icono"><Icono nombre={f.icono} /></div>
              <h3>{f.titulo}</h3>
              <p>{f.texto}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Tus datos ----------

function Lugar({ tipo, icono, titulo, sub, items }: { tipo: "pc" | "nube"; icono: NombreIcono; titulo: string; sub: string; items: string[] }) {
  return (
    <div className={`lugar ${tipo}`}>
      <div className="que"><Icono nombre={icono} />{titulo}</div>
      <p className="sub">{sub}</p>
      <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}

export function TusDatos() {
  return (
    <section className="seccion" id="privacidad">
      <div className="envoltura">
        <Encabezado titulo="Los datos de los pacientes no salen de tu computadora.">
          Son datos de salud. Por eso la aplicación los guarda en tu PC y no en un servidor de internet. Lo único que está en línea es tu cuenta.
        </Encabezado>
        <div className="privacidad">
          <Lugar tipo="pc" icono="pc" titulo="En tu computadora" sub="Todo lo que cargás." items={[
            "Pacientes: nombre, n.º de afiliado y plan",
            "Consultas y prácticas, con fecha y monto",
            "Profesionales, obras sociales y aranceles",
            "El historial de cambios",
          ]} />
          <div className="flecha"><Icono nombre="flecha" grosor={1.6} />Solo para iniciar sesión</div>
          <Lugar tipo="nube" icono="nube" titulo="En internet" sub="Solo tu cuenta." items={[
            "Tu nombre y email",
            "Tu contraseña, cifrada",
            "Tu plan y cuántos profesionales tenés cargados",
          ]} />
        </div>
        <p className="aclaracion">
          <strong>Importante:</strong> como los datos están solo en tu PC, hacé copias de seguridad. Si se rompe el disco,
          nosotros no tenemos una copia para devolverte. Si necesitás ayuda para armarlas, escribinos.
        </p>
      </div>
    </section>
  );
}

// ---------- Cómo empezar ----------

export function Pasos() {
  const prueba = PLANES.find((p) => p.precioMensual === null);
  const pasos = [
    ["Descargá e instalá", 'Bajá el instalador para Windows y seguí los pasos. Si Windows avisa "Editor desconocido", tocá "Más información" y "Ejecutar de todas formas".'],
    ["Creá tu cuenta", `Con tu nombre, email y una contraseña. Arrancás con el plan de prueba, gratis, para ${prueba?.profesionales === 1 ? "un profesional" : `${prueba?.profesionales ?? 1} profesionales`}.`],
    ["Cargá y exportá", "Agregá el médico, sus obras sociales y aranceles. Después cargá las prestaciones del mes y exportá la planilla."],
  ];
  return (
    <section className="seccion alterna" id="como">
      <div className="envoltura">
        <Encabezado titulo="Empezás en cinco minutos." />
        <ol className="pasos">
          {pasos.map(([titulo, texto]) => <li key={titulo}><h3>{titulo}</h3><p>{texto}</p></li>)}
        </ol>
      </div>
    </section>
  );
}

// ---------- Planes ----------

export function Planes() {
  const maximo = Math.max(...PLANES.map((p) => p.profesionales));
  return (
    <section className="seccion" id="planes">
      <div className="envoltura">
        <Encabezado titulo="Pagás según cuántos médicos liquidás.">
          Todos los planes tienen todas las funciones. Lo único que cambia es la cantidad de profesionales.
        </Encabezado>
        <div className="planes">
          {PLANES.map((p) => {
            const gratis = p.precioMensual === null;
            const items = [
              p.profesionales === 1 ? "1 profesional" : `Hasta ${p.profesionales} profesionales`,
              ...(gratis ? ["Obras sociales y prestaciones sin límite", "Exportación a Excel y CSV"] : ["Todas las funciones", "Ayuda por WhatsApp"]),
            ];
            return (
              <article className={`plan${p.destacado ? " destacado" : ""}`} key={p.nombre}>
                {p.destacado && <span className="cinta">El más elegido</span>}
                <h3>{p.nombre}</h3>
                <p className="para">{p.para}</p>
                <div className="precio">
                  {gratis ? <span className="gratis">Gratis</span> : <><span className="num">{pesos(p.precioMensual!)}</span><span className="periodo">por mes</span></>}
                </div>
                <ul>{items.map((i) => <li key={i}><Icono nombre="tilde" grosor={2.4} />{i}</li>)}</ul>
                <a className={`btn ${p.destacado ? "primario" : "secundario"}`} href={gratis ? "#descargar" : "#contacto"}>
                  {gratis ? "Descargar" : "Quiero este plan"}
                </a>
              </article>
            );
          })}
        </div>
        <p className="nota-planes">
          Para pasar de plan, escribinos y lo cambiamos en tu cuenta. Tus datos no se tocan. ¿Liquidás para más de {maximo} médicos? Consultanos.
        </p>
      </div>
    </section>
  );
}

// ---------- Preguntas ----------

const PREGUNTAS: [string, string][] = [
  ["¿Necesito internet para usarla?",
    "Sí, para entrar: la aplicación verifica tu cuenta cada vez que la abrís. Lo que viaja es solo tu email y tu contraseña; los datos de los pacientes nunca se envían."],
  ["¿Emite facturas electrónicas?",
    "No. Prepara la liquidación y la planilla que se presenta a cada obra social. La factura la seguís emitiendo como siempre, desde ARCA o tu sistema de facturación."],
  ["¿En qué computadoras funciona?",
    "En Windows 10 y 11. Si usás Linux, consultanos. Por ahora no hay versión para Mac."],
  ["¿Y si cambio de computadora?",
    "Instalás la aplicación en la nueva, entrás con tu cuenta y copiás el archivo de datos desde la anterior. Si querés, te ayudamos a hacerlo."],
  ['¿Por qué Windows dice "Editor desconocido" al instalar?',
    'Es un aviso que Windows muestra con los programas que todavía no tienen certificado de firma. Tocá "Más información" y después "Ejecutar de todas formas".'],
  ["¿Puedo seguir usando mis planillas de Excel?",
    "Sí. La aplicación exporta en el mismo formato de siempre (Consultas y Prácticas separadas, con totales), así que podés seguir trabajando el archivo en Excel si lo necesitás."],
];

export function Preguntas() {
  return (
    <section className="seccion alterna" id="preguntas">
      <div className="envoltura">
        <Encabezado titulo="Preguntas frecuentes" />
        <div className="preguntas">
          {PREGUNTAS.map(([p, r]) => <details key={p}><summary>{p}</summary><p>{r}</p></details>)}
        </div>
      </div>
    </section>
  );
}

// ---------- Contacto ----------

export function Contacto() {
  return (
    <section className="seccion" id="contacto">
      <div className="envoltura">
        <div className="contacto">
          <div>
            <h2>¿Querés verla funcionando o tenés dudas?</h2>
            <p>Escribinos y te la mostramos, te ayudamos a cargar tus aranceles o te pasamos a un plan pago.</p>
          </div>
          <div className="acciones">
            <a className="btn primario" href={enlaceWhatsApp()} target="_blank" rel="noopener noreferrer">
              <Icono nombre="chat" />Escribinos por WhatsApp
            </a>
            <a className="btn secundario" href={enlaceEmail()}>
              <Icono nombre="email" />Mandanos un email
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
