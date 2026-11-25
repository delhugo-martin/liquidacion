import { useCallback, useEffect, useMemo, useState } from "react";
import { CampoFecha } from "./componentes/CampoFecha";
import { api } from "./api";
import type { Afiliado, Arancel, Unidad, ObraSocial, Periodo, Prestacion, Profesional, Usuario } from "./tipos";
import { avisar, isoATexto, mensajeDe, pesos } from "./formato";
import { Profesionales } from "./componentes/Profesionales";
import { ObrasSociales } from "./componentes/ObrasSociales";
import { FormPrestacion } from "./componentes/FormPrestacion";
import { TablaPrestaciones } from "./componentes/TablaPrestaciones";
import { Aranceles } from "./componentes/Aranceles";

/** Lee y guarda en el navegador preferencias simples (último profesional, período). */
const recordar = {
  leer: (k: string) => { try { return localStorage.getItem(`fact.${k}`) ?? ""; } catch { return ""; } },
  guardar: (k: string, v: string) => { try { localStorage.setItem(`fact.${k}`, v); } catch { /* sin almacenamiento */ } },
};

export function Facturacion({ usuario, onSalir }: { usuario: Usuario; onSalir: () => void }) {
  const [profesionales, setProfesionales] = useState<Profesional[] | null>(null);
  const [profId, setProfId] = useState(recordar.leer("profesional"));
  const [verProfesionales, setVerProfesionales] = useState(false);

  const [obras, setObras] = useState<ObraSocial[]>([]);
  const [osId, setOsId] = useState("");

  const [periodo, setPeriodo] = useState<Periodo>({ desde: recordar.leer("desde"), hasta: recordar.leer("hasta") });
  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [aranceles, setAranceles] = useState<Arancel[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [afiliados, setAfiliados] = useState<Afiliado[]>([]);
  const [editando, setEditando] = useState<Prestacion | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [formato, setFormato] = useState<"xlsx" | "csv">(recordar.leer("formato") === "csv" ? "csv" : "xlsx");

  // --- Carga de datos ---

  const cargarProfesionales = useCallback(async () => {
    try {
      const lista = await api.profesionales();
      setProfesionales(lista);
      setProfId((actual) => (lista.some((p) => p.id === actual) ? actual : lista[0]?.id ?? ""));
    } catch (err) { avisar(mensajeDe(err)); setProfesionales([]); }
  }, []);

  const cargarObras = useCallback(async (pid: string) => {
    if (!pid) { setObras([]); setOsId(""); return; }
    try {
      const lista = await api.obrasSociales(pid);
      setObras(lista);
      setOsId((actual) => (lista.some((o) => o.id === actual) ? actual : lista[0]?.id ?? ""));
    } catch (err) { avisar(mensajeDe(err)); }
  }, []);

  const cargarDatosOs = useCallback(async (id: string, p: Periodo) => {
    if (!id) { setPrestaciones([]); setAranceles([]); setUnidades([]); setAfiliados([]); return; }
    try {
      const [pr, ar, un, af] = await Promise.all([api.prestaciones(id, p), api.aranceles(id), api.unidades(id), api.afiliados(id)]);
      setPrestaciones(pr); setAranceles(ar); setUnidades(un); setAfiliados(af);
    } catch (err) { avisar(mensajeDe(err)); }
  }, []);

  useEffect(() => { cargarProfesionales(); }, [cargarProfesionales]);
  useEffect(() => { recordar.guardar("profesional", profId); setEditando(null); cargarObras(profId); }, [profId, cargarObras]);
  useEffect(() => { setEditando(null); cargarDatosOs(osId, periodo); }, [osId, periodo, cargarDatosOs]);
  useEffect(() => { setNombreArchivo(""); }, [osId]);

  const refrescar = () => { cargarDatosOs(osId, periodo); cargarObras(profId); };

  // --- Resumen ---

  const resumen = useMemo(() => {
    const consultas = prestaciones.filter((p) => p.tipo === "consulta");
    const practicas = prestaciones.filter((p) => p.tipo === "practica");
    const suma = (l: Prestacion[]) => l.reduce((s, p) => s + p.monto, 0);
    const gravado = suma(prestaciones.filter((p) => p.iva === "GRAVADO"));
    const noGravado = suma(prestaciones.filter((p) => p.iva === "NO GRAVADO"));
    return { consultas, practicas, gravado, noGravado, total: gravado + noGravado };
  }, [prestaciones]);

  const cambiarPeriodo = (p: Periodo) => {
    recordar.guardar("desde", p.desde); recordar.guardar("hasta", p.hasta); setPeriodo(p);
  };

  const borrar = async (p: Prestacion) => {
    try {
      await api.borrarPrestacion(p.id);
      if (editando?.id === p.id) setEditando(null);
      avisar("Prestación borrada"); refrescar();
    } catch (err) { avisar(mensajeDe(err)); }
  };

  const profesional = profesionales?.find((p) => p.id === profId);
  const obra = obras.find((o) => o.id === osId);
  // Nombre sugerido para el CSV, ej. "DASPU 01-11-26 al 30-11-26"; se usa si el campo queda vacío
  const fechaArchivo = (iso: string) => isoATexto(iso).replace(/\//g, "-");
  const nombreSugerido = obra
    ? [obra.nombre, periodo.desde ? `desde ${fechaArchivo(periodo.desde)}` : "", periodo.hasta ? `al ${fechaArchivo(periodo.hasta)}` : ""]
      .filter(Boolean).join(" ")
    : "";

  // --- Pantalla ---

  return (
    <div className="contenedor">
      <header className="encabezado">
        <div className="titulo">
          <div className="eyebrow">Facturación por obra social</div>
          {profesionales && profesionales.length > 0 ? (
            <div className="selector-prof">
              <label htmlFor="prof" className="sr">Profesional</label>
              <select id="prof" value={profId} onChange={(e) => setProfId(e.target.value)}>
                {profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              <button className="btn" onClick={() => setVerProfesionales((v) => !v)}>
                {verProfesionales ? "Cerrar" : "Profesionales"}
              </button>
            </div>
          ) : (
            <h1>Bienvenido/a, {usuario.nombre}</h1>
          )}
        </div>
        <div className="cuenta">
          <span>{usuario.email}</span>
          <button className="btn fantasma" onClick={onSalir}>Salir</button>
        </div>
      </header>

      {profesionales === null ? (
        <div className="cargando">Cargando…</div>
      ) : profesionales.length === 0 || verProfesionales ? (
        <Profesionales
          lista={profesionales}
          onCambio={async (nuevoId) => { await cargarProfesionales(); if (nuevoId) setProfId(nuevoId); setVerProfesionales(false); }}
          primeraVez={profesionales.length === 0}
        />
      ) : (
        <>
          <ObrasSociales
            profesionalId={profId}
            obras={obras}
            seleccionada={osId}
            onSeleccionar={setOsId}
            onCambio={async (nuevaId) => { await cargarObras(profId); if (nuevaId) setOsId(nuevaId); }}
          />

          {!obra ? (
            <section className="panel vacio">
              Agregá la primera obra social de {profesional?.nombre} con el botón <strong>+ Obra social</strong>.
            </section>
          ) : (
            <>
              <div className="barra">
                <div className="campo angosto">
                  <label htmlFor="desde">Desde</label>
                  <CampoFecha id="desde" value={periodo.desde} onChange={(desde) => cambiarPeriodo({ ...periodo, desde })} />
                </div>
                <div className="campo angosto">
                  <label htmlFor="hasta">Hasta</label>
                  <CampoFecha id="hasta" value={periodo.hasta} onChange={(hasta) => cambiarPeriodo({ ...periodo, hasta })} />
                </div>
                <button className="btn" onClick={() => cambiarPeriodo({ desde: "", hasta: "" })}>Ver todo</button>
                <span className="espacio" />
                {prestaciones.length > 0 && (
                  <>
                    <div className="campo nombre-archivo">
                      <label htmlFor="nombreArchivo">Nombre del archivo</label>
                      <input id="nombreArchivo" value={nombreArchivo} onChange={(e) => setNombreArchivo(e.target.value)}
                        placeholder={nombreSugerido} maxLength={120} autoComplete="off" />
                    </div>
                    <div className="campo formato-archivo">
                      <label htmlFor="formato">Formato</label>
                      <select id="formato" value={formato}
                        onChange={(e) => { const f = e.target.value as "xlsx" | "csv"; setFormato(f); recordar.guardar("formato", f); }}>
                        <option value="xlsx">Excel (.xlsx)</option>
                        <option value="csv">CSV (.csv)</option>
                      </select>
                    </div>
                    <a className="btn" href={api.urlExportar(osId, periodo, nombreArchivo || nombreSugerido, formato)} download>Exportar</a>
                  </>
                )}
              </div>

              <section className="resumen" aria-label="Resumen del período">
                <div><span className="k">Consultas</span><span className="v">{resumen.consultas.length}</span></div>
                <div><span className="k">Prácticas</span><span className="v">{resumen.practicas.length}</span></div>
                <div><span className="k">Gravado</span><span className="v">{pesos(resumen.gravado)}</span></div>
                <div><span className="k">No gravado</span><span className="v">{pesos(resumen.noGravado)}</span></div>
                <div className="total"><span className="k">Total a facturar</span><span className="v">{pesos(resumen.total)}</span></div>
              </section>

              <FormPrestacion
                key={`${osId}-${editando?.id ?? "nueva"}`}
                obraSocialId={osId}
                aranceles={aranceles}
                afiliados={afiliados}
                editando={editando}
                onGuardado={() => { setEditando(null); refrescar(); }}
                onCancelar={() => setEditando(null)}
              />

              <TablaPrestaciones titulo="Consultas" filas={resumen.consultas} obra={obra.nombre}
                editandoId={editando?.id} onEditar={setEditando} onBorrar={borrar} />
              <TablaPrestaciones titulo="Prácticas" filas={resumen.practicas} obra={obra.nombre}
                editandoId={editando?.id} onEditar={setEditando} onBorrar={borrar} />

              <Aranceles key={obra.id} obraSocial={obra} aranceles={aranceles} unidades={unidades} onCambio={() => cargarDatosOs(osId, periodo)}
                onBorrarObra={async () => {
                  try { await api.borrarObraSocial(obra.id); avisar("Obra social borrada"); setOsId(""); cargarObras(profId); }
                  catch (err) { avisar(mensajeDe(err)); }
                }} />
            </>
          )}
        </>
      )}
    </div>
  );
}
