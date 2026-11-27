-- Migración 004 · Código automático de productos (p1, p2, p3...)
-- Ejecutar en Neon DESPUÉS de 003_usuarios_productos.sql: SQL Editor -> pegar -> Run.
-- Se puede correr más de una vez sin problema.
--
-- El código de un producto nuevo ya no lo escribe nadie: lo genera Neon con
-- una SECUENCIA. Una secuencia es atómica: aunque dos personas creen un
-- producto al mismo tiempo, cada una recibe un número distinto. Y nunca
-- repite un número, aunque el producto se desactive o la inserción falle
-- (pueden quedar huecos, por ejemplo p8, p10, pero nunca dos p9).

CREATE SEQUENCE IF NOT EXISTS productos_cod_seq;

-- La secuencia sigue después del código pN más alto que ya existe,
-- contando los productos desactivados. Si ya se había usado (por ejemplo,
-- al volver a correr este script), nunca retrocede.
SELECT setval('productos_cod_seq', GREATEST(n, 1), n > 0)
  FROM (SELECT GREATEST(
          (SELECT COALESCE(MAX(substring(cod FROM '^p([0-9]{1,9})$')::bigint), 0) FROM productos),
          (SELECT CASE WHEN is_called THEN last_value ELSE 0 END FROM productos_cod_seq)
        ) AS n) AS ultimo;

-- Un INSERT que no trae el código recibe el siguiente: 'p' || número.
ALTER TABLE productos ALTER COLUMN cod SET DEFAULT ('p' || nextval('productos_cod_seq'));

-- Si algún día se borra la tabla, la secuencia se borra con ella.
ALTER SEQUENCE productos_cod_seq OWNED BY productos.cod;
