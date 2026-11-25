import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../api";
import { CampoFecha } from "./CampoFecha";
import type { Afiliado, Arancel, Iva, Prestacion, Tipo } from "../tipos";
import { avisar, hoy, leerMonto, mensajeDe, montoEditable } from "../formato";

interface Campos {
  tipo: Tipo; fecha: string; plan: string; afiliado: string; paciente: string;
  codigo: string; practica: string; monto: string; iva: Iva; marca: string;
}

function camposIniciales(tipo: Tipo, fecha: string, aranceles: Arancel[]): Campos {
  // Para consultas suele haber un solo arancel: se completa de entrada.
  const unico = aranceles.filter((a) => a.tipo === tipo);
  const a = tipo === "consulta" && unico.length === 1 ? unico[0] : undefined;
  return {
    tipo, fecha, plan: "", afiliado: "", paciente: "", iva: "GRAVADO", marca: "",
    codigo: a?.codigo ?? "", practica: a?.nombre ?? "", monto: a ? montoEditable(a.monto) : "",
  };
}

const desdePrestacion = (p: Prestacion): Campos => ({ ...p, monto: montoEditable(p.monto) });

export function FormPrestacion({ obraSocialId, aranceles, afiliados, editando, onGuardado, onCancelar }: {
  obraSocialId: string;
  aranceles: Arancel[];
  afiliados: Afiliado[];
  editando: Prestacion | null;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const [c, setC] = useState<Campos>(() => (editando ? desdePrestacion(editando) : camposIniciales("consulta", hoy(), aranceles)));
  const [enviando, setEnviando] = useState(false);
  const refAfiliado = useRef<HTMLInputElement>(null);
  const set = (cambios: Partial<Campos>) => setC((prev) => ({ ...prev, ...cambios }));

  // Los aranceles llegan después de montar el formulario: completa la consulta si todavía está vacía.
  useEffect(() => {
    if (editando) return;
    setC((prev) => (prev.codigo || prev.practica || prev.monto
      ? prev
      : { ...prev, ...camposIniciales(prev.tipo, prev.fecha, aranceles), plan: prev.plan, afiliado: prev.afiliado,
          paciente: prev.paciente, iva: prev.iva, marca: prev.marca }));
  }, [aranceles, editando]);

  const delTipo = aranceles.filter((a) => a.tipo === c.tipo);
  const usarArancel = (a: Arancel) => set({ codigo: a.codigo, practica: a.nombre, monto: montoEditable(a.monto) });

  const cambiarTipo = (tipo: Tipo) => {
    if (editando) set({ tipo });
    else setC({ ...camposIniciales(tipo, c.fecha, aranceles), plan: c.plan, afiliado: c.afiliado, paciente: c.paciente, marca: c.marca, iva: c.iva });
  };

  const alCambiarAfiliado = (valor: string) => {
    const conocido = afiliados.find((a) => a.afiliado === valor.trim());
    if (conocido) set({ afiliado: valor, paciente: conocido.paciente, plan: conocido.plan, marca: c.marca || conocido.marca });
    else set({ afiliado: valor });
  };

  /** Al revés: un nombre conocido completa n° de afiliado y plan. Si hay dos afiliados con el mismo nombre, no adivina. */
  const alCambiarPaciente = (valor: string) => {
    const nombre = valor.trim().toUpperCase();
    const coinciden = nombre ? afiliados.filter((a) => a.paciente.toUpperCase() === nombre) : [];
    // No pisar un n° de afiliado nuevo que el usuario ya escribió a mano
    const afiliadoLibre = !c.afiliado.trim() || afiliados.some((a) => a.afiliado === c.afiliado.trim());
    const conocido = coinciden.length === 1 ? coinciden[0]! : undefined;
    if (conocido && afiliadoLibre)
      set({ paciente: valor, afiliado: conocido.afiliado, plan: conocido.plan, marca: c.marca || conocido.marca });
    else set({ paciente: valor });
  };

  const alCambiarCodigo = (valor: string) => {
    const a = delTipo.find((x) => x.codigo === valor.trim());
    if (a) usarArancel(a); else set({ codigo: valor });
  };

  const alCambiarPractica = (valor: string) => {
    const a = delTipo.find((x) => x.nombre === valor.trim().toUpperCase());
    if (a) usarArancel(a); else set({ practica: valor });
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    const monto = leerMonto(c.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      avisar("El monto no es válido. Escribilo así: 28458 o 28.458,00");
      return;
    }
    setEnviando(true);
    try {
      const datos = { ...c, monto };
      if (editando) {
        await api.editarPrestacion(editando.id, datos);
        avisar("Cambios guardados");
      } else {
        await api.crearPrestacion(obraSocialId, datos);
        avisar("Prestación agregada");
        setC(camposIniciales(c.tipo, c.fecha, aranceles)); // mantiene tipo y fecha para cargar la siguiente
        refAfiliado.current?.focus();
      }
      onGuardado();
    } catch (err) {
      avisar(mensajeDe(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel-h">
        <h2>{editando ? "Editando prestación" : "Cargar prestación"}</h2>
        <div className="segmentado" role="group" aria-label="Tipo de prestación">
          <button type="button" aria-pressed={c.tipo === "consulta"} onClick={() => cambiarTipo("consulta")}>Consulta</button>
          <button type="button" aria-pressed={c.tipo === "practica"} onClick={() => cambiarTipo("practica")}>Práctica</button>
        </div>
      </div>
      <form className="panel-b" onSubmit={guardar} autoComplete="off">
        <div className="grilla-form">
          <div className="campo"><label htmlFor="fFecha">Fecha</label>
            <CampoFecha id="fFecha" value={c.fecha} onChange={(fecha) => set({ fecha })} required /></div>
          <div className="campo"><label htmlFor="fPlan">Plan</label>
            <input id="fPlan" value={c.plan} onChange={(e) => set({ plan: e.target.value })} placeholder="1500" /></div>
          <div className="campo"><label htmlFor="fAfil">N° de afiliado</label>
            <input id="fAfil" ref={refAfiliado} list="lista-afiliados" value={c.afiliado} onChange={(e) => alCambiarAfiliado(e.target.value)} required placeholder="2232393/00" /></div>
          <div className="campo ancho"><label htmlFor="fPac">Apellido y nombre</label>
            <input id="fPac" list="lista-pacientes" value={c.paciente} onChange={(e) => alCambiarPaciente(e.target.value)} required /></div>
          <div className="campo"><label htmlFor="fCod">Cód. práctica</label>
            <input id="fCod" className="num" list="lista-codigos" value={c.codigo} onChange={(e) => alCambiarCodigo(e.target.value)} required /></div>
          <div className="campo ancho"><label htmlFor="fPrac">Práctica</label>
            <input id="fPrac" list="lista-practicas" value={c.practica} onChange={(e) => alCambiarPractica(e.target.value)} required /></div>
          <div className="campo"><label htmlFor="fMonto">Monto</label>
            <input id="fMonto" className="num" inputMode="decimal" value={c.monto} onChange={(e) => set({ monto: e.target.value })} required /></div>
          <div className="campo"><label htmlFor="fIva">Cond. IVA</label>
            <select id="fIva" value={c.iva} onChange={(e) => set({ iva: e.target.value as Iva })}>
              <option value="GRAVADO">GRAVADO</option><option value="NO GRAVADO">NO GRAVADO</option>
            </select></div>
          <div className="campo"><label htmlFor="fMarca">Marca</label>
            <input id="fMarca" maxLength={3} className="mayus" value={c.marca} onChange={(e) => set({ marca: e.target.value })} /></div>
        </div>

        <datalist id="lista-afiliados">{afiliados.map((a) => <option key={a.afiliado} value={a.afiliado}>{a.paciente}</option>)}</datalist>
        <datalist id="lista-pacientes">{afiliados.map((a) => <option key={a.afiliado} value={a.paciente}>{a.afiliado}</option>)}</datalist>
        <datalist id="lista-codigos">{delTipo.map((a) => <option key={a.id} value={a.codigo}>{a.nombre}</option>)}</datalist>
        <datalist id="lista-practicas">{delTipo.map((a) => <option key={a.id} value={a.nombre}>{a.codigo}</option>)}</datalist>

        <div className="acciones-form">
          <span className="ayuda">Un afiliado conocido (por número o por nombre) completa los otros datos. Una práctica de los aranceles completa código y monto.</span>
          {editando && <button type="button" className="btn" onClick={onCancelar}>Cancelar edición</button>}
          <button className="btn primario" disabled={enviando}>{editando ? "Guardar cambios" : "Agregar"}</button>
        </div>
      </form>
    </section>
  );
}
