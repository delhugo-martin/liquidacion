-- Nube de Liquidación (versión escritorio)
-- Acá SOLO se guardan las cuentas de los facturistas, su plan y cuántos profesionales tienen cargados.
-- Los datos de los profesionales, pacientes y prestaciones quedan en la PC de cada facturista.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Planes de suscripción: cuántos profesionales permite cada uno.
CREATE TABLE planes (
  id                    text PRIMARY KEY,           -- 'prueba', 'basico', ...
  nombre                text NOT NULL,
  limite_profesionales  int  NOT NULL CHECK (limite_profesionales > 0)
);
INSERT INTO planes (id, nombre, limite_profesionales) VALUES
  ('prueba', 'Prueba', 1),
  ('basico', 'Básico', 3),
  ('profesional', 'Profesional', 10);

CREATE TABLE usuarios (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text NOT NULL,
  nombre           text NOT NULL,
  password_hash    text NOT NULL,
  acepto_terminos  timestamptz NOT NULL,
  plan             text NOT NULL DEFAULT 'prueba' REFERENCES planes(id),
  -- Cuántos profesionales tiene cargados en su PC (lo informa la app al agregar o borrar uno).
  profesionales    int  NOT NULL DEFAULT 0 CHECK (profesionales >= 0),
  creado           timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX usuarios_email_uq ON usuarios (lower(email));

-- La app guarda un token aleatorio; acá se guarda solo su hash.
CREATE TABLE sesiones (
  token_hash  bytea PRIMARY KEY,
  usuario_id  uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira      timestamptz NOT NULL,
  creado      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sesiones_usuario_idx ON sesiones (usuario_id);
