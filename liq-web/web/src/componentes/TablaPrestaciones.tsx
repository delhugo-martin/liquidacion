import type { Prestacion } from "../tipos";
import { fechaCorta, pesos } from "../formato";
import { BotonConfirmar } from "./BotonConfirmar";

export function TablaPrestaciones({ titulo, filas, obra, editandoId, onEditar, onBorrar }: {
  titulo: string;
  filas: Prestacion[];
  obra: string;
  editandoId?: string;
  onEditar: (p: Prestacion) => void;
  onBorrar: (p: Prestacion) => void;
}) {
  const subtotal = filas.reduce((s, p) => s + p.monto, 0);

  return (
    <section className="panel">
      <div className="panel-h">
        <h2>{titulo}</h2>
        <span className="estado">{filas.length} {filas.length === 1 ? "registro" : "registros"}</span>
      </div>
      <div className="tabla-envoltura">
        <table className="ancha">
          <thead>
            <tr>
              <th>Plan</th><th>N° afiliado</th><th>Apellido y nombre</th><th>Fecha</th><th>Práctica</th>
              <th className="d">Cód.</th><th className="d">Monto</th><th>Cond. IVA</th><th>Marca</th><th />
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr><td colSpan={10} className="vacio">No hay {titulo.toLowerCase()} de {obra} en este período.</td></tr>
            ) : filas.map((p) => (
              <tr key={p.id} className={p.id === editandoId ? "editando" : ""}>
                <td className="mono">{p.plan}</td>
                <td className="mono">{p.afiliado}</td>
                <td>{p.paciente}</td>
                <td className="mono">{fechaCorta(p.fecha)}</td>
                <td>{p.practica}</td>
                <td className="mono d">{p.codigo}</td>
                <td className="mono d">{pesos(p.monto)}</td>
                <td><span className={`pill ${p.iva === "GRAVADO" ? "g" : "ng"}`}>{p.iva === "GRAVADO" ? "Gravado" : "No gravado"}</span></td>
                <td className="marca">{p.marca}</td>
                <td><div className="acciones">
                  <button className="btn fantasma" onClick={() => { onEditar(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button>
                  <BotonConfirmar onConfirmar={() => onBorrar(p)} />
                </div></td>
              </tr>
            ))}
          </tbody>
          {filas.length > 0 && (
            <tfoot><tr><td colSpan={6}>Subtotal</td><td className="mono d">{pesos(subtotal)}</td><td colSpan={3} /></tr></tfoot>
          )}
        </table>
      </div>
    </section>
  );
}
