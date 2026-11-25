import { useState, type FormEvent } from "react";
import { api } from "../api";
import type { Profesional } from "../tipos";
import { avisar, mensajeDe } from "../formato";
import { BotonConfirmar } from "./BotonConfirmar";

const vacio = { nombre: "", matricula: "", cuit: "" };

/** Alta, edición y baja de los profesionales para los que factura el usuario. */
export function Profesionales({ lista, primeraVez, onCambio }: {
  lista: Profesional[]; primeraVez: boolean; onCambio: (nuevoId?: string) => void;
}) {
  const [form, setForm] = useState(vacio);
  const [editId, setEditId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const p = editId ? await api.editarProfesional(editId, form) : await api.crearProfesional(form);
      avisar(editId ? "Profesional actualizado" : "Profesional agregado");
      setForm(vacio); setEditId(null);
      onCambio(p.id);
    } catch (err) { avisar(mensajeDe(err)); } finally { setEnviando(false); }
  };

  const borrar = async (p: Profesional) => {
    try { await api.borrarProfesional(p.id); avisar("Profesional borrado"); onCambio(); }
    catch (err) { avisar(mensajeDe(err)); }
  };

  return (
    <section className="panel">
      <div className="panel-h">
        <h2>{primeraVez ? "Agregá el primer profesional" : "Profesionales"}</h2>
      </div>
      <form className="panel-b fila-form" onSubmit={guardar} autoComplete="off">
        {primeraVez && <p className="ayuda">Es el médico o la médica para quien facturás. Podés agregar todos los que necesites.</p>}
        <div className="campo ancho">
          <label htmlFor="pNombre">Nombre</label>
          <input id="pNombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}  required />
        </div>
        <div className="campo">
          <label htmlFor="pMat">Matrícula</label>
          <input id="pMat" value={form.matricula} onChange={(e) => setForm({ ...form, matricula: e.target.value })} />
        </div>
        <div className="campo">
          <label htmlFor="pCuit">CUIT</label>
          <input id="pCuit" value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} />
        </div>
        <div className="acciones-form">
          {editId && <button type="button" className="btn" onClick={() => { setEditId(null); setForm(vacio); }}>Cancelar</button>}
          <button className="btn primario" disabled={enviando}>{editId ? "Guardar cambios" : "Agregar profesional"}</button>
        </div>
      </form>

      {lista.length > 0 && (
        <div className="tabla-envoltura">
          <table>
            <thead><tr><th>Nombre</th><th>Matrícula</th><th>CUIT</th><th /></tr></thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id} className={editId === p.id ? "editando" : ""}>
                  <td>{p.nombre}</td><td className="mono">{p.matricula}</td><td className="mono">{p.cuit}</td>
                  <td><div className="acciones">
                    <button className="btn fantasma" onClick={() => { setEditId(p.id); setForm({ nombre: p.nombre, matricula: p.matricula, cuit: p.cuit }); }}>Editar</button>
                    <BotonConfirmar texto="Borrar" confirmar="Borrar con todos sus datos" onConfirmar={() => borrar(p)} />
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
