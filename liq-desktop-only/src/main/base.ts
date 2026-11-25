import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Base de datos local (SQLite) con los datos de los profesionales de UNA cuenta.
 * Cada cuenta tiene su propio archivo, así dos facturistas que comparten la PC no ven los datos del otro
 * desde la app. Los datos nunca salen de la PC.
 */
export type Base = DatabaseSync;

const ahora = "(strftime('%Y-%m-%dT%H:%M:%fZ','now'))";

// Cada cambio de esquema se agrega al final; PRAGMA user_version guarda cuántos se aplicaron.
const MIGRACIONES: string[] = [
  `
  CREATE TABLE profesionales (
    id         TEXT PRIMARY KEY,
    nombre     TEXT NOT NULL,
    matricula  TEXT NOT NULL DEFAULT '',
    cuit       TEXT NOT NULL DEFAULT '',
    creado     TEXT NOT NULL DEFAULT ${ahora}
  );

  CREATE TABLE obras_sociales (
    id              TEXT PRIMARY KEY,
    profesional_id  TEXT NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
    nombre          TEXT NOT NULL,
    orden           INTEGER NOT NULL DEFAULT 0,
    creado          TEXT NOT NULL DEFAULT ${ahora},
    UNIQUE (profesional_id, nombre)
  );

  -- Unidades de arancel (UB, galeno, ...) con su valor en pesos.
  CREATE TABLE unidades (
    id              TEXT PRIMARY KEY,
    obra_social_id  TEXT NOT NULL REFERENCES obras_sociales(id) ON DELETE CASCADE,
    nombre          TEXT NOT NULL,
    valor           REAL NOT NULL CHECK (valor > 0),
    UNIQUE (obra_social_id, nombre),
    UNIQUE (id, obra_social_id)
  );

  -- Monto fijo, o cantidad de una unidad de la misma obra social (nunca las dos cosas).
  CREATE TABLE aranceles (
    id              TEXT PRIMARY KEY,
    obra_social_id  TEXT NOT NULL REFERENCES obras_sociales(id) ON DELETE CASCADE,
    tipo            TEXT NOT NULL CHECK (tipo IN ('consulta', 'practica')),
    codigo          TEXT NOT NULL,
    nombre          TEXT NOT NULL,
    monto           REAL CHECK (monto > 0),
    unidad_id       TEXT,
    cantidad        REAL,
    UNIQUE (obra_social_id, tipo, codigo),
    CHECK ((unidad_id IS NULL AND cantidad IS NULL AND monto IS NOT NULL) OR
           (unidad_id IS NOT NULL AND cantidad > 0 AND monto IS NULL)),
    FOREIGN KEY (unidad_id, obra_social_id) REFERENCES unidades(id, obra_social_id)
  );
  CREATE INDEX aranceles_unidad_idx ON aranceles (unidad_id);

  CREATE TABLE prestaciones (
    id              TEXT PRIMARY KEY,
    obra_social_id  TEXT NOT NULL REFERENCES obras_sociales(id) ON DELETE CASCADE,
    tipo            TEXT NOT NULL CHECK (tipo IN ('consulta', 'practica')),
    fecha           TEXT NOT NULL,
    plan            TEXT NOT NULL DEFAULT '',
    afiliado        TEXT NOT NULL,
    paciente        TEXT NOT NULL,
    codigo          TEXT NOT NULL,
    practica        TEXT NOT NULL,
    monto           REAL NOT NULL CHECK (monto > 0),
    iva             TEXT NOT NULL CHECK (iva IN ('GRAVADO', 'NO GRAVADO')),
    marca           TEXT NOT NULL DEFAULT '' CHECK (length(marca) <= 3),
    creado          TEXT NOT NULL DEFAULT ${ahora},
    modificado      TEXT NOT NULL DEFAULT ${ahora}
  );
  CREATE INDEX prestaciones_os_fecha_idx ON prestaciones (obra_social_id, fecha);
  CREATE INDEX prestaciones_afiliado_idx ON prestaciones (obra_social_id, afiliado);

  -- Registro de cambios de prestaciones, aranceles y unidades. Solo se agregan filas: no se pueden modificar ni borrar.
  CREATE TABLE auditoria (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    tabla      TEXT NOT NULL,
    fila_id    TEXT NOT NULL,
    operacion  TEXT NOT NULL,
    antes      TEXT,
    despues    TEXT,
    fecha      TEXT NOT NULL DEFAULT ${ahora}
  );
  CREATE TRIGGER auditoria_sin_cambios BEFORE UPDATE ON auditoria
    BEGIN SELECT RAISE(ABORT, 'La auditoría no se puede modificar.'); END;
  CREATE TRIGGER auditoria_sin_borrar BEFORE DELETE ON auditoria
    BEGIN SELECT RAISE(ABORT, 'La auditoría no se puede borrar.'); END;

  ${triggersAuditoria("prestaciones", ["id", "obra_social_id", "tipo", "fecha", "plan", "afiliado", "paciente", "codigo", "practica", "monto", "iva", "marca"])}
  ${triggersAuditoria("aranceles", ["id", "obra_social_id", "tipo", "codigo", "nombre", "monto", "unidad_id", "cantidad"])}
  ${triggersAuditoria("unidades", ["id", "obra_social_id", "nombre", "valor"])}
  `,
];

/** Triggers que copian cada alta, cambio o baja de `tabla` a la auditoría (como JSON). */
function triggersAuditoria(tabla: string, columnas: string[]) {
  const json = (fila: "OLD" | "NEW") => `json_object(${columnas.map((c) => `'${c}', ${fila}.${c}`).join(", ")})`;
  return `
  CREATE TRIGGER ${tabla}_aud_alta AFTER INSERT ON ${tabla} BEGIN
    INSERT INTO auditoria (tabla, fila_id, operacion, despues) VALUES ('${tabla}', NEW.id, 'INSERT', ${json("NEW")});
  END;
  CREATE TRIGGER ${tabla}_aud_cambio AFTER UPDATE ON ${tabla} BEGIN
    INSERT INTO auditoria (tabla, fila_id, operacion, antes, despues) VALUES ('${tabla}', NEW.id, 'UPDATE', ${json("OLD")}, ${json("NEW")});
  END;
  CREATE TRIGGER ${tabla}_aud_baja AFTER DELETE ON ${tabla} BEGIN
    INSERT INTO auditoria (tabla, fila_id, operacion, antes) VALUES ('${tabla}', OLD.id, 'DELETE', ${json("OLD")});
  END;`;
}

/** Abre (o crea) la base de la cuenta y la deja al día. */
export function abrirBase(carpeta: string): Base {
  mkdirSync(carpeta, { recursive: true });
  const db = new DatabaseSync(path.join(carpeta, "local.sqlite"));
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;");

  const version = (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
  for (let i = version; i < MIGRACIONES.length; i++) {
    enTransaccion(db, () => {
      db.exec(MIGRACIONES[i]!);
      db.exec(`PRAGMA user_version = ${i + 1}`);
    });
  }
  return db;
}

/** Ejecuta `fn` en una transacción: si algo falla, no queda nada a medias. */
export function enTransaccion<T>(db: Base, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
