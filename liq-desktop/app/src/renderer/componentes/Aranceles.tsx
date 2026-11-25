import { useState, type FormEvent } from "react";
import { api, type DatosArancel } from "../api";
import type { Arancel, ObraSocial, Tipo, Unidad } from "../tipos";
import { avisar, cantidadTexto, leerMonto, mensajeDe, montoEditable, pesos } from "../formato";
import { BotonConfirmar } from "./BotonConfirmar";
import { Unidades } from "./Unidades";

/**
 * Lista de precios de la obra social: códigos, nombres y montos que se autocompletan al cargar.
 * Cada arancel tiene monto fijo, o una cantidad de alguna unidad de la obra social (ej. 2,5 UB).
 */
export function Aranceles({ obraSocial, aranceles, unidades, onCambio, onBorrarObra }: {
  obraSocial: ObraSocial; aranceles: Arancel[]; unidades: Unidad[]; onCambio: () => void; onBorrarObra: () => void;
}) {
  const [tipo, setTipo] = useState<Tipo>("consulta");
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [unidadId, setUnidadId] = useState(""); // "" = monto fijo
  const [valor, setValor] = useState(""); // el monto, o la cantidad de unidades
  const [editId, setEditId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const unidad = unidades.find((u) => u.id === unidadId);
  const numero = leerMonto(valor);
  const montoCalculado = unidad && Number.isFinite(numero) && numero > 0 ? Math.round(numero * unidad.valor * 100) / 100 : null;

  const limpiar = () => { setEditId(null); setTipo("consulta"); setCodigo(""); setNombre(""); setValor(""); };

  const editar = (a: Arancel) => {
    setEditId(a.id); setTipo(a.tipo); setCodigo(a.codigo); setNombre(a.nombre);
    setUnidadId(a.unidadId ?? "");
    setValor(a.unidadId && a.cantidad != null ? cantidadTexto(a.cantidad) : montoEditable(a.monto));
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(numero) || numero <= 0) { avisar(unidad ? "La cantidad no es válida." : "El monto no es válido."); return; }
    setEnviando(true);
    try {
      const datos: DatosArancel = unidad
        ? { tipo, codigo, nombre, unidadId: unidad.id, cantidad: numero }
        : { tipo, codigo, nombre, monto: numero };
      if (editId) await api.editarArancel(editId, datos);
      else await api.guardarArancel(obraSocial.id, datos);
      avisar(editId ? "Arancel actualizado" : "Arancel guardado");
      limpiar();
      onCambio();
    } catch (err) { avisar(mensajeDe(err)); } finally { setEnviando(false); }
  };

  const borrar = async (a: Arancel) => {
    try { await api.borrarArancel(a.id); if (a.id === editId) limpiar(); avisar("Arancel quitado"); onCambio(); }
    catch (err) { avisar(mensajeDe(err)); }
  };

  return (
    <section className="panel">
      <details className="panel-b aranceles" open={aranceles.length === 0}>
        <summary>Aranceles de {obraSocial.nombre} ({aranceles.length})</summary>
        <p className="ayuda">{editId
          ? "Editando un arancel. Las prestaciones ya cargadas conservan el monto con que se cargaron."
          : "Si cargás un código que ya existe, se actualizan su nombre y su monto."}</p>
        <form className="grilla-aranceles" onSubmit={guardar} autoComplete="off">
          <div className="campo"><label htmlFor="aTipo">Tipo</label>
            <select id="aTipo" value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
              <option value="consulta">Consulta</option><option value="practica">Práctica</option>
            </select></div>
          <div className="campo"><label htmlFor="aCod">Código</label>
            <input id="aCod" className="num" value={codigo} onChange={(e) => setCodigo(e.target.value)} required placeholder="420101" /></div>
          <div className="campo"><label htmlFor="aNom">Nombre</label>
            <input id="aNom" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="CONSULTAS" /></div>
          <div className="campo"><label htmlFor="aMedida">Se cobra por</label>
            <select id="aMedida" value={unidadId} onChange={(e) => setUnidadId(e.target.value)}>
              <option value="">Monto fijo ($)</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nombre} ({pesos(u.valor)})</option>)}
            </select></div>
          <div className="campo"><label htmlFor="aValor">{unidad ? `Cantidad de ${unidad.nombre}` : "Monto"}</label>
            <input id="aValor" className="num" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} required
              placeholder={unidad ? "2,5" : "28.458,00"} />
            {unidad && <small className="calculado">{montoCalculado != null ? `= ${pesos(montoCalculado)}` : " "}</small>}
          </div>
          <div className="acciones-form">
            {editId && <button type="button" className="btn" onClick={limpiar}>Cancelar</button>}
            <button className="btn primario" disabled={enviando}>{editId ? "Guardar cambios" : "Guardar arancel"}</button>
          </div>
        </form>
        {aranceles.length > 0 && (
          <div className="tabla-envoltura">
            <table>
              <thead><tr><th>Tipo</th><th className="d">Código</th><th>Nombre</th><th className="d">Unidades</th><th className="d">Monto</th><th /></tr></thead>
              <tbody>
                {aranceles.map((a) => (
                  <tr key={a.id} className={a.id === editId ? "editando" : ""}>
                    <td>{a.tipo === "consulta" ? "Consulta" : "Práctica"}</td>
                    <td className="mono d">{a.codigo}</td><td>{a.nombre}</td>
                    <td className="mono d tenue">{a.unidad && a.cantidad != null ? `${cantidadTexto(a.cantidad)} ${a.unidad}` : ""}</td>
                    <td className="mono d">{pesos(a.monto)}</td>
                    <td><div className="acciones">
                      <button className="btn fantasma" onClick={() => editar(a)}>Editar</button>
                      <BotonConfirmar texto="Quitar" onConfirmar={() => borrar(a)} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Unidades obraSocial={obraSocial} unidades={unidades} aranceles={aranceles}
          onCambio={onCambio} onBorrada={(id) => { if (id === unidadId) setUnidadId(""); }} />
        <div className="zona-peligro">
          <span className="ayuda">Borrar {obraSocial.nombre} elimina también sus aranceles y todas sus prestaciones.</span>
          <BotonConfirmar texto="Borrar obra social" confirmar={`Sí, borrar ${obraSocial.nombre}`} onConfirmar={onBorrarObra} />
        </div>
      </details>
    </section>
  );
}
