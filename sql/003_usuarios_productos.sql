-- Migración 003 · Usuarios y mantenimiento de productos
-- Ejecutar en Neon DESPUÉS de 002_detalle_lineas.sql: SQL Editor -> pegar -> Run.
-- Se puede correr más de una vez sin problema (IF NOT EXISTS).

-- Usuarios del sistema. Pueden entrar con email y contraseña, con Google,
-- o con las dos formas.
--  - password_hash: NULL si el usuario solo entra con Google. Nunca se
--    guarda la contraseña, solo su hash (scrypt, lo calcula el backend).
--  - google_sub: id estable de la cuenta de Google ("sub" del token). Se
--    llena la primera vez que el usuario entra con Google.
--  - rol: admin mantiene productos y usuarios; cajero solo factura.
--  - activo: "eliminar" un usuario lo desactiva (no se borra la fila).
-- El primer administrador se crea con el script del backend
-- (api/scripts/crear-admin.js), porque necesita el hash de la contraseña.
CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  nombre        TEXT NOT NULL,
  password_hash TEXT,
  google_sub    TEXT UNIQUE,
  rol           TEXT NOT NULL CHECK (rol IN ('admin','cajero')),
  activo        BOOLEAN NOT NULL DEFAULT true,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- "Eliminar" un producto lo desactiva. No se borra la fila porque
-- lineas.producto_cod no tiene llave foránea y el detalle de una factura
-- vieja toma el nombre del producto con un JOIN: si se borrara, el
-- historial quedaría sin nombre.
ALTER TABLE productos ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;
