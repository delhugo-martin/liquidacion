-- Unidades de arancel (UB, galeno, NBU, ...): cada obra social define las suyas con su valor en pesos.
-- Un arancel puede tener monto fijo (como antes) o una cantidad de alguna unidad de la misma obra social;
-- en ese caso su monto es cantidad × valor de la unidad, y cambia solo cuando cambia el valor.

CREATE TABLE unidades (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid NOT NULL DEFAULT app_usuario(),
  obra_social_id  uuid NOT NULL,
  nombre          text NOT NULL,
  valor           numeric(12,2) NOT NULL CHECK (valor > 0),
  UNIQUE (obra_social_id, nombre),
  UNIQUE (id, usuario_id),
  UNIQUE (id, obra_social_id),
  FOREIGN KEY (obra_social_id, usuario_id) REFERENCES obras_sociales(id, usuario_id) ON DELETE CASCADE
);

ALTER TABLE aranceles
  ALTER COLUMN monto DROP NOT NULL,
  ADD COLUMN unidad_id uuid,
  ADD COLUMN cantidad  numeric(12,4),
  -- O monto fijo, o cantidad de una unidad: nunca las dos cosas ni ninguna
  ADD CONSTRAINT aranceles_monto_o_unidad CHECK (
    (unidad_id IS NULL AND cantidad IS NULL AND monto IS NOT NULL) OR
    (unidad_id IS NOT NULL AND cantidad > 0 AND monto IS NULL)),
  -- La unidad tiene que ser del mismo usuario y de la misma obra social. No se puede borrar una unidad en uso.
  ADD CONSTRAINT aranceles_unidad_usuario_fk FOREIGN KEY (unidad_id, usuario_id) REFERENCES unidades(id, usuario_id),
  ADD CONSTRAINT aranceles_unidad_os_fk FOREIGN KEY (unidad_id, obra_social_id) REFERENCES unidades(id, obra_social_id);

CREATE INDEX aranceles_unidad_idx ON aranceles (unidad_id);

CREATE TRIGGER unidades_auditoria AFTER INSERT OR UPDATE OR DELETE ON unidades
  FOR EACH ROW EXECUTE FUNCTION auditar();

ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidades FORCE ROW LEVEL SECURITY;
CREATE POLICY solo_propios ON unidades USING (usuario_id = app_usuario()) WITH CHECK (usuario_id = app_usuario());
