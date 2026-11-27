// Rutas de productos (contrato §4.3 y §4.9)
//   GET    /api/productos          catálogo: productos activos y kits
//   POST   /api/productos          crear un producto
//   PUT    /api/productos/{cod}    actualizar un producto
//   DELETE /api/productos/{cod}    desactivar un producto
//
// Las reglas del negocio NO están aquí: antes de guardar en Neon se le
// pregunta al motor Prolog si el producto es válido (contrato §3.7). Esta
// ruta solo revisa la forma de los datos, consulta al motor y guarda.
import { Router } from 'express';
import { conflicto, datosInvalidos, noEncontrado } from '../errores.js';
import { leerCatalogo } from '../consultas.js';
import { validarCodProducto, validarDatosProducto } from '../validacion.js';

const COLUMNAS = 'cod, nombre, categoria, precio, stock';

// Fila de Neon -> JSON del contrato (§4.3).
const aJson = ({ cod, nombre, categoria, precio, stock }) => ({
  cod,
  nombre,
  tipo: 'producto',
  categoria,
  precio,
  stock,
});

// Si el motor encontró errores, se responde 400 con los mensajes de
// Prolog y la lista completa (con el campo de cada error).
function exigirValido({ valido, errores }) {
  if (!valido) throw datosInvalidos(errores.map((e) => e.mensaje), errores);
}

// El producto tiene que existir y estar activo; si no, 404.
function exigirActivo(catalogo, cod) {
  if (!catalogo.productos.some((p) => p.cod === cod && p.activo)) {
    throw noEncontrado(`No existe el producto ${cod}`);
  }
}

function rutasProductos({ db, motor }) {
  const router = Router();

  // ---------------------------------------------------------------- listar
  // Productos activos y kits juntos. El precio de cada kit lo calcula el
  // MOTOR (preciosKits), para no repetir la regla de los kits aquí.
  router.get('/', async (req, res) => {
    const { productos, kits } = await leerCatalogo(db);
    const preciosKits = await motor.preciosKits({ productos, kits });

    res.json([
      ...productos.map(aJson),
      ...kits.map((k) => ({
        cod: k.cod,
        nombre: k.nombre,
        tipo: 'kit',
        categoria: 'general',
        precio: preciosKits[k.cod] ?? null,
        stock: null,
        componentes: k.componentes,
      })),
    ]);
  });

  // ----------------------------------------------------------------- crear
  router.post('/', async (req, res) => {
    const producto = validarDatosProducto(req.body, { conCod: true });

    const catalogo = await leerCatalogo(db, { incluirInactivos: true });
    exigirValido(await motor.validarProducto({ operacion: 'crear', producto, ...catalogo }));

    try {
      const { rows } = await db.query(
        `INSERT INTO productos (cod, nombre, categoria, precio, stock)
         VALUES ($1, $2, $3, $4, $5) RETURNING ${COLUMNAS}`,
        [producto.cod, producto.nombre, producto.categoria, producto.precio, producto.stock],
      );
      res.status(201).json(aJson(rows[0]));
    } catch (err) {
      // Dos personas crearon el mismo código al mismo tiempo: el motor no
      // lo vio, pero la llave primaria de Neon sí.
      if (err.code === '23505') {
        throw conflicto(`Ya existe un producto con el código ${producto.cod}.`);
      }
      throw err;
    }
  });

  // ------------------------------------------------------------ actualizar
  // Se mandan todos los campos menos el código, que no se puede cambiar
  // porque las facturas viejas lo usan.
  router.put('/:cod', async (req, res) => {
    const cod = validarCodProducto(req.params.cod);
    if (req.body?.cod !== undefined && req.body.cod !== cod) {
      throw datosInvalidos(['El código de un producto no se puede cambiar.']);
    }
    const datos = validarDatosProducto(req.body, { conCod: false });

    const catalogo = await leerCatalogo(db, { incluirInactivos: true });
    exigirActivo(catalogo, cod);
    exigirValido(
      await motor.validarProducto({
        operacion: 'actualizar',
        producto: { cod, ...datos },
        ...catalogo,
      }),
    );

    const { rows } = await db.query(
      `UPDATE productos SET nombre = $2, categoria = $3, precio = $4, stock = $5
        WHERE cod = $1 AND activo
       RETURNING ${COLUMNAS}`,
      [cod, datos.nombre, datos.categoria, datos.precio, datos.stock],
    );
    // Lo desactivaron entre la lectura y el UPDATE.
    if (rows.length === 0) throw noEncontrado(`No existe el producto ${cod}`);
    res.json(aJson(rows[0]));
  });

  // -------------------------------------------------------------- eliminar
  // No se borra la fila: se desactiva (sql/003). Así el historial sigue
  // mostrando el nombre del producto en las facturas viejas.
  router.delete('/:cod', async (req, res) => {
    const cod = validarCodProducto(req.params.cod);

    const catalogo = await leerCatalogo(db, { incluirInactivos: true });
    exigirActivo(catalogo, cod);
    const { valido, errores } = await motor.validarEliminarProducto({ cod, ...catalogo });
    if (!valido) {
      throw conflicto(
        'No se puede eliminar el producto',
        errores.map((e) => e.mensaje),
        errores,
      );
    }

    await db.query('UPDATE productos SET activo = false WHERE cod = $1', [cod]);
    res.status(204).end();
  });

  return router;
}

export { rutasProductos };
