-- Migración 002 · Detalle calculado de cada línea (docs/CONTRATO.md §5)
-- Ejecutar en Neon DESPUÉS de facturacion_neon.sql: SQL Editor -> pegar -> Run.
-- Se puede correr más de una vez sin problema (IF NOT EXISTS).
--
-- El backend llena estas columnas al emitir la factura, con lo que calcula
-- el motor Prolog. Se guardan porque al consultar una factura vieja no se
-- puede recalcular: el stock y los precios pudieron cambiar.
-- En una factura pendiente (sin emitir) o rechazada quedan en NULL.
ALTER TABLE lineas
  ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC,  -- un kit puede tener decimales (k2 = 453791.25)
  ADD COLUMN IF NOT EXISTS categoria       TEXT,
  ADD COLUMN IF NOT EXISTS desc_volumen    INTEGER,  -- porcentaje entero: 5 = 5 %
  ADD COLUMN IF NOT EXISTS desc_cliente    INTEGER,
  ADD COLUMN IF NOT EXISTS base            INTEGER,  -- redondeada al colón
  ADD COLUMN IF NOT EXISTS tarifa_iva      INTEGER,
  ADD COLUMN IF NOT EXISTS iva             INTEGER;

-- Las facturas se consultan casi siempre junto con sus líneas.
CREATE INDEX IF NOT EXISTS lineas_factura_id_idx ON lineas (factura_id);
