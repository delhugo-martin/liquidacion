import { useState, type FormEvent } from "react";
import { api } from "./api";
import type { Usuario } from "./tipos";
import { mensajeDe } from "./formato";

export function Ingreso({ onIngreso }: { onIngreso: (u: Usuario) => void }) {
  const [modo, setModo] = useState<"ingresar" | "registrarse">("ingresar");
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const u = modo === "ingresar"
        ? await api.ingresar(email, password)
        : await api.registrarse({ email, nombre, password, aceptaTerminos: acepta });
      onIngreso(u);
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setEnviando(false);
    }
  };

  const registro = modo === "registrarse";

  return (
    <main className="ingreso">
      <form className="tarjeta" onSubmit={enviar}>
        <div className="eyebrow">Facturación por obra social</div>
        <h1>{registro ? "Crear cuenta" : "Ingresar"}</h1>

        {registro && (
          <div className="campo">
            <label htmlFor="nombre">Tu nombre</label>
            <input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoComplete="name" />
          </div>
        )}
        <div className="campo">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="campo">
          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            minLength={registro ? 10 : undefined} autoComplete={registro ? "new-password" : "current-password"} />
          {registro && <small>Mínimo 10 caracteres.</small>}
        </div>

        {registro && (
          <label className="check">
            <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} required />
            <span>
              Acepto los <a href="./terminos.html" target="_blank" rel="noreferrer">términos y condiciones</a> y la{" "}
              <a href="./privacidad.html" target="_blank" rel="noreferrer">política de privacidad</a>. Los datos de pacientes que
              cargue son responsabilidad del profesional para quien facturo.
            </span>
          </label>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        <button className="btn primario" disabled={enviando}>
          {enviando ? "Un momento…" : registro ? "Crear cuenta" : "Ingresar"}
        </button>
        <button type="button" className="btn fantasma" onClick={() => { setModo(registro ? "ingresar" : "registrarse"); setError(""); }}>
          {registro ? "Ya tengo cuenta" : "Crear una cuenta nueva"}
        </button>
      </form>
    </main>
  );
}
