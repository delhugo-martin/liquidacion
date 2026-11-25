-- Facturación de prestaciones por obra social
-- Modelo: un usuario (facturista) tiene varios profesionales;
-- cada profesional tiene sus obras sociales, cada obra social sus aranceles y prestaciones.
--
-- Aislamiento entre facturistas en DOS capas:
--   1. Cada tabla de datos tiene usuario_id y las claves foráneas compuestas
--      (id, usuario_id) impiden mezclar filas de usuarios distintos.
--   2. Row Level Security: la API fija app.usuario_id en cada transacción y
--      Postgres solo deja ver/escribir filas de ese usuario, aunque la consulta
--      tenga un error.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Cuentas y sesiones (sin RLS: las usa solo el módulo de autenticación) ----------

CREATE TABLE usuarios (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text NOT NULL,
  nombre           text NOT NULL,
  password_hash    text NOT NULL,
  acepto_terminos  timestamptz NOT NULL,
  creado           timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX usuarios_email_uq ON usuarios (lower(email));

CREATE TABLE sesiones (
  token_hash  bytea PRIMARY KEY,
  usuario_id  uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira      timestamptz NOT NULL,
  creado      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sesiones_usuario_idx ON sesiones (usuario_id);

-- ---------- Datos de facturación (con RLS) ----------

-- Devuelve el usuario de la transacción actual (lo fija la API).
CREATE FUNCTION app_usuario() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.usuario_id', true), '')::uuid
$$;

CREATE TABLE profesionales (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  uuid NOT NULL DEFAULT app_usuario() REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  matricula   text NOT NULL DEFAULT '',
  cuit        text NOT NULL DEFAULT '',
  creado      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, usuario_id)
);

CREATE TABLE obras_sociales (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid NOT NULL DEFAULT app_usuario(),
  profesional_id  uuid NOT NULL,
  nombre          text NOT NULL,
  orden           int  NOT NULL DEFAULT 0,
  creado          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, usuario_id),
  UNIQUE (profesional_id, nombre),
  FOREIGN KEY (profesional_id, usuario_id) REFERENCES profesionales(id, usuario_id) ON DELETE CASCADE
);

CREATE TYPE tipo_prestacion AS ENUM ('consulta', 'practica');
CREATE TYPE condicion_iva   AS ENUM ('GRAVADO', 'NO GRAVADO');

CREATE TABLE aranceles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid NOT NULL DEFAULT app_usuario(),
  obra_social_id  uuid NOT NULL,
  tipo            tipo_prestacion NOT NULL,
  codigo          text NOT NULL,
  nombre          text NOT NULL,
  monto           numeric(12,2) NOT NULL CHECK (monto > 0),
  UNIQUE (obra_social_id, tipo, codigo),
  FOREIGN KEY (obra_social_id, usuario_id) REFERENCES obras_sociales(id, usuario_id) ON DELETE CASCADE
);

CREATE TABLE prestaciones (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid NOT NULL DEFAULT app_usuario(),
  obra_social_id  uuid NOT NULL,
  tipo            tipo_prestacion NOT NULL,
  fecha           date NOT NULL,
  plan            text NOT NULL DEFAULT '',
  afiliado        text NOT NULL,
  paciente        text NOT NULL,
  codigo          text NOT NULL,
  practica        text NOT NULL,
  monto           numeric(12,2) NOT NULL CHECK (monto > 0),
  iva             condicion_iva NOT NULL,
  marca           text NOT NULL DEFAULT '' CHECK (length(marca) <= 3),
  creado          timestamptz NOT NULL DEFAULT now(),
  modificado      timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (obra_social_id, usuario_id) REFERENCES obras_sociales(id, usuario_id) ON DELETE CASCADE
);
CREATE INDEX prestaciones_os_fecha_idx ON prestaciones (obra_social_id, fecha);
CREATE INDEX prestaciones_afiliado_idx ON prestaciones (obra_social_id, afiliado);

-- Registro de cambios: quién creó, modificó o borró cada prestación o arancel.
CREATE TABLE auditoria (
  id          bigserial PRIMARY KEY,
  usuario_id  uuid NOT NULL,
  tabla       text NOT NULL,
  fila_id     uuid NOT NULL,
  operacion   text NOT NULL,
  antes       jsonb,
  despues     jsonb,
  fecha       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auditoria_usuario_idx ON auditoria (usuario_id, fecha DESC);

CREATE FUNCTION auditar() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO auditoria (usuario_id, tabla, fila_id, operacion, antes)
    VALUES (OLD.usuario_id, TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO auditoria (usuario_id, tabla, fila_id, operacion, antes, despues)
    VALUES (NEW.usuario_id, TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSE
    INSERT INTO auditoria (usuario_id, tabla, fila_id, operacion, despues)
    VALUES (NEW.usuario_id, TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END $$;

CREATE TRIGGER prestaciones_auditoria AFTER INSERT OR UPDATE OR DELETE ON prestaciones
  FOR EACH ROW EXECUTE FUNCTION auditar();
CREATE TRIGGER aranceles_auditoria AFTER INSERT OR UPDATE OR DELETE ON aranceles
  FOR EACH ROW EXECUTE FUNCTION auditar();

-- ---------- Row Level Security ----------

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['profesionales','obras_sociales','aranceles','prestaciones','auditoria'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY solo_propios ON %I USING (usuario_id = app_usuario()) WITH CHECK (usuario_id = app_usuario())', t);
  END LOOP;
END $$;
