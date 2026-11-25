import { useState, type FormEvent } from "react";
import { api } from "../api";
import type { Arancel, ObraSocial, Unidad } from "../tipos";
import { avisar, leerMonto, mensajeDe, montoEditable, pesos } from "../formato";
import { BotonConfirmar } from "./BotonConfirmar";

/** Unidades de la obra social (UB, galeno, ...) con su valor. Cambiar el valor actualiza los aranceles que la usan. */
export function Unidades({ obraSocial, unidades, aranceles, onCambio, onBorrada }: {
  obraSocial: ObraSocial; unidades: Unidad[]; aranceles: Arancel[]; onCambio: () => void; onBorrada: (id: string) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [valor, setValor] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const usos = (u: Unidad) => aranceles.filter((a) => a.unidadId === u.id).length;
  const limpiar = () => { setEditId(null); setNombre(""); setValor(""); };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    const v = leerMonto(valor);
    if (!Number.isFinite(v) || v <= 0) { avisar("El valor no es válido."); return; }
    setEnviando(true);
    try {
      if (editId) await api.editarUnidad(editId, { nombre, valor: v });
      else await api.crearUnidad(obraSocial.id, { nombre, valor: v });
      avisar(editId ? "Unidad actualizada" : "Unidad agregada");
      limpiar();
      onCambio();
    } catch (err) { avisar(mensajeDe(err)); } finally { setEnviando(false); }
  };

  const borrar = async (u: Unidad) => {
    try { await api.borrarUnidad(u.id); if (u.id === editId) limpiar(); onBorrada(u.id); avisar("Unidad quitada"); onCambio(); }
    catch (err) { avisar(mensajeDe(err)); }
  };

  const editando = unidades.find((u) => u.id === editId);

  return (
    <div className="unidades">
      <h3>Unidades</h3>
      <p className="ayuda">{editando && usos(editando) > 0
        ? `Al cambiar el valor de ${editando.nombre} se ${usos(editando) === 1 ? "actualiza el arancel que la usa" : `actualizan los ${usos(editando)} aranceles que la usan`}. Las prestaciones ya cargadas no cambian.`
        : "Para aranceles que se cobran por unidad (UB, galeno, …): cargá el valor de cada unidad y elegila en el arancel."}</p>
      <form className="grilla-unidades" onSubmit={guardar} autoComplete="off">
        <div className="campo"><label htmlFor="uNom">Nombre</label>
          <input id="uNom" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="UB" maxLength={20} /></div>
        <div className="campo"><label htmlFor="uValor">Valor de 1 unidad</label>
          <input id="uValor" className="num" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} required placeholder="1.200,00" /></div>
        <div className="acciones-form">
          {editId && <button type="button" className="btn" onClick={limpiar}>Cancelar</button>}
          <button className="btn" disabled={enviando}>{editId ? "Guardar cambios" : "Agregar unidad"}</button>
        </div>
      </form>
      {unidades.length > 0 && (
        <div className="tabla-envoltura">
          <table>
            <thead><tr><th>Unidad</th><th className="d">Valor</th><th className="d">Aranceles</th><th /></tr></thead>
            <tbody>
              {unidades.map((u) => (
                <tr key={u.id} className={u.id === editId ? "editando" : ""}>
                  <td>{u.nombre}</td><td className="mono d">{pesos(u.valor)}</td><td className="mono d">{usos(u)}</td>
                  <td><div className="acciones">
                    <button className="btn fantasma" onClick={() => { setEditId(u.id); setNombre(u.nombre); setValor(montoEditable(u.valor)); }}>Editar</button>
                    <BotonConfirmar texto="Quitar" onConfirmar={() => borrar(u)} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
