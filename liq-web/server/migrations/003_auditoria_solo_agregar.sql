-- La auditoría es un registro "solo agregar": se pueden crear y leer filas, pero nunca modificarlas ni borrarlas,
-- ni siquiera conectándose directo a la base con el usuario de la aplicación.
-- Dos capas, igual que el resto:
--   1. Permisos: el usuario de la aplicación (dueño de la tabla) pierde UPDATE, DELETE y TRUNCATE.
--   2. Row Level Security: solo hay políticas para leer e insertar las filas propias.

DO $$
BEGIN
  EXECUTE format('REVOKE UPDATE, DELETE, TRUNCATE ON auditoria FROM %I', current_user);
END $$;
REVOKE UPDATE, DELETE, TRUNCATE ON auditoria FROM PUBLIC;

DROP POLICY solo_propios ON auditoria;
CREATE POLICY leer_propios ON auditoria FOR SELECT USING (usuario_id = app_usuario());
CREATE POLICY agregar_propios ON auditoria FOR INSERT WITH CHECK (usuario_id = app_usuario());
