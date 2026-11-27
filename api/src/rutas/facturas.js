// Rutas de facturas (contrato §4.4 a §4.7)
//   GET  /api/facturas?estado=&cliente=
//   GET  /api/facturas/{id}
//   POST /api/facturas
//   POST /api/facturas/{id}/emitir
import { Router } from 'express';
import { conflicto, datosInvalidos, noEncontrado } from '../errores.js';
import { leerCatalogo, leerFactura } from '../consultas.js';
import { validarFiltrosFacturas, validarIdFactura, validarNuevaFactura } from '../validacion.js';

function rutasFacturas({ db, motor }) {
  const router = Router();

  // ---------------------------------------------------------------- listar
  router.get('/', async (req, res) => {
    const { estado, cliente } = validarFiltrosFacturas(req.query);

    // Los filtros van como parámetros: si vienen en null, no filtran.
    // "pendiente" es una factura sin emitir (estado NULL en Neon).
    const { rows } = await db.query(
      `SELECT f.id, f.cliente_id, c.nombre AS cliente_nombre, f.forma_pago,
              COALESCE(f.estado, 'pendiente') AS estado,
              f.subtotal, f.iva, f.total, f.creada_en
         FROM facturas f
         JOIN clientes c ON c.id = f.cliente_id
        WHERE ($1::text IS NULL OR COALESCE(f.estado, 'pendiente') = $1)
          AND ($2::text IS NULL OR f.cliente_id = $2)
        ORDER BY f.id`,
      [estado, cliente],
    );

    res.json(
      rows.map((f) => ({
        id: f.id,
        clienteId: f.cliente_id,
        clienteNombre: f.cliente_nombre,
        formaPago: f.forma_pago,
        estado: f.estado,
        subtotal: f.subtotal,
        iva: f.iva,
        total: f.total,
        creadaEn: f.creada_en,
      })),
    );
  });

  // --------------------------------------------------------------- detalle
  router.get('/:id', async (req, res) => {
    const id = validarIdFactura(req.params.id);
    const factura = await leerFactura(db, id);
    if (!factura) throw noEncontrado(`No existe la factura ${id}`);
    res.json(factura);
  });

  // ----------------------------------------------------------------- crear
  router.post('/', async (req, res) => {
    const nueva = validarNuevaFactura(req.body);

    const factura = await db.transaccion(async (tx) => {
      await revisarQueExistan(tx, nueva);

      const { rows } = await tx.query(
        'INSERT INTO facturas (cliente_id, forma_pago) VALUES ($1, $2) RETURNING id',
        [nueva.clienteId, nueva.formaPago],
      );
      const id = rows[0].id;

      for (const linea of nueva.lineas) {
        await tx.query(
          'INSERT INTO lineas (factura_id, producto_cod, cantidad) VALUES ($1, $2, $3)',
          [id, linea.productoCod, linea.cantidad],
        );
      }
      return leerFactura(tx, id);
    });

    res.status(201).location(`/api/facturas/${factura.id}`).json(factura);
  });

  // ---------------------------------------------------------------- emitir
  router.post('/:id/emitir', async (req, res) => {
    const id = validarIdFactura(req.params.id);

    // Todo en UNA transacción: o se guarda el resultado completo (estado,
    // totales, detalle de líneas y stock) o no se guarda nada.
    const resultado = await db.transaccion(async (tx) => {
      // FOR UPDATE bloquea la factura: si llegan dos "emitir" a la vez,
      // el segundo espera y luego recibe 409.
      const f = await tx.query(
        'SELECT id, cliente_id, forma_pago, estado FROM facturas WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (f.rows.length === 0) throw noEncontrado(`No existe la factura ${id}`);
      const factura = f.rows[0];
      if (factura.estado === 'emitida') throw conflicto(`La factura ${id} ya fue emitida`);

      const lineas = (
        await tx.query(
          'SELECT id, producto_cod, cantidad FROM lineas WHERE factura_id = $1 ORDER BY id',
          [id],
        )
      ).rows;
      const cliente = (
        await tx.query('SELECT id, nombre, tipo, nivel FROM clientes WHERE id = $1', [factura.cliente_id])
      ).rows[0];
      // Se bloquea el stock para que dos facturas no vendan las mismas unidades.
      const { productos, kits } = await leerCatalogo(tx, { bloquearStock: true });

      const r = await motor.calcularFactura({
        factura: { id, clienteId: factura.cliente_id, formaPago: factura.forma_pago },
        lineas: lineas.map((l) => ({ productoCod: l.producto_cod, cantidad: l.cantidad })),
        cliente,
        productos,
        kits: kits.map((k) => ({ cod: k.cod, componentes: k.componentes })),
      });
      revisarResultadoDelMotor(r, lineas);

      await tx.query(
        `UPDATE facturas SET estado = $2, subtotal = $3, iva = $4, total = $5, errores = $6
          WHERE id = $1`,
        [id, r.estado, r.subtotal, r.iva, r.total, JSON.stringify(r.errores)],
      );

      if (r.estado === 'emitida') {
        // El motor devuelve las líneas en el mismo orden en que se le dieron.
        for (const [i, l] of r.lineas.entries()) {
          await tx.query(
            `UPDATE lineas SET precio_unitario = $2, categoria = $3, desc_volumen = $4,
                    desc_cliente = $5, base = $6, tarifa_iva = $7, iva = $8
              WHERE id = $1`,
            [lineas[i].id, l.precioUnitario, l.categoria, l.descVolumen, l.descCliente,
              l.base, l.tarifaIva, l.iva],
          );
        }
        for (const { productoCod, cantidad } of r.consumoStock) {
          const act = await tx.query(
            'UPDATE productos SET stock = stock - $2 WHERE cod = $1 AND stock >= $2',
            [productoCod, cantidad],
          );
          // No debería pasar: el motor ya revisó el stock con los datos bloqueados.
          if (act.rowCount !== 1) {
            throw new Error(`No se pudo descontar ${cantidad} de ${productoCod}`);
          }
        }
      } else {
        // Rechazada: si antes tenía detalle de otra emisión, se borra.
        await tx.query(
          `UPDATE lineas SET precio_unitario = NULL, categoria = NULL, desc_volumen = NULL,
                  desc_cliente = NULL, base = NULL, tarifa_iva = NULL, iva = NULL
            WHERE factura_id = $1`,
          [id],
        );
      }
      return r;
    });

    // Una factura rechazada también responde 200: la petición se procesó
    // bien; la que dijo que no fue la regla del negocio (contrato §4.7).
    res.json({ id, ...resultado });
  });

  return router;
}

// El cliente y todos los productos/kits de la factura tienen que existir.
// Un producto desactivado cuenta como inexistente.
// La tabla lineas no tiene llave foránea, así que se revisa aquí.
async function revisarQueExistan(tx, { clienteId, lineas }) {
  const detalles = [];

  const cliente = await tx.query('SELECT 1 FROM clientes WHERE id = $1', [clienteId]);
  if (cliente.rowCount === 0) detalles.push(`El cliente ${clienteId} no existe.`);

  const codigos = [...new Set(lineas.map((l) => l.productoCod))];
  if (codigos.length) {
    const { rows } = await tx.query(
      `SELECT cod FROM productos WHERE cod = ANY($1::text[]) AND activo
       UNION SELECT cod FROM kits WHERE cod = ANY($1::text[])`,
      [codigos],
    );
    const existentes = new Set(rows.map((r) => r.cod));
    lineas.forEach((l, i) => {
      if (!existentes.has(l.productoCod)) {
        detalles.push(`La línea ${i + 1}: el producto ${l.productoCod} no existe en el catálogo.`);
      }
    });
  }

  if (detalles.length) throw datosInvalidos(detalles);
}

// Defensa contra un motor que devuelva algo inesperado: es mejor fallar con
// 500 que guardar datos incoherentes en Neon.
function revisarResultadoDelMotor(r, lineas) {
  const ok =
    r &&
    ['emitida', 'rechazada'].includes(r.estado) &&
    Array.isArray(r.errores) &&
    Array.isArray(r.consumoStock) &&
    Array.isArray(r.lineas) &&
    (r.estado === 'rechazada' ||
      (r.lineas.length === lineas.length &&
        r.lineas.every((l, i) => l.productoCod === lineas[i].producto_cod)));
  if (!ok) throw new Error('El motor devolvió un resultado con un formato inesperado');
}

export { rutasFacturas };
