// GET /api/reportes (contrato §4.8)
// Se calcula con SQL sobre Neon, sin el motor. Solo cuentan las facturas
// EMITIDAS. Con los datos de ejemplo debe dar los mismos números que los
// reportes del motor Prolog: es una verificación cruzada para el informe.
import { Router } from 'express';

function rutasReportes({ db }) {
  const router = Router();

  router.get('/', async (req, res) => {
    const totales = await db.query(
      `SELECT COALESCE(SUM(total), 0) AS ventas, COALESCE(SUM(iva), 0) AS iva
         FROM facturas
        WHERE estado = 'emitida'`,
    );

    // Unidades por código de línea: un kit cuenta como kit (igual que el motor).
    const unidades = await db.query(
      `SELECT l.producto_cod, COALESCE(p.nombre, k.nombre, l.producto_cod) AS nombre,
              SUM(l.cantidad) AS unidades
         FROM lineas l
         JOIN facturas f ON f.id = l.factura_id AND f.estado = 'emitida'
         LEFT JOIN productos p ON p.cod = l.producto_cod
         LEFT JOIN kits k ON k.cod = l.producto_cod
        GROUP BY l.producto_cod, p.nombre, k.nombre
        ORDER BY l.producto_cod`,
    );

    // Siguiente número que va a usar la secuencia de facturas.
    const consecutivo = await db.query(
      `SELECT COALESCE(pg_sequence_last_value(pg_get_serial_sequence('facturas', 'id')::regclass), 0) + 1
              AS siguiente`,
    );

    const unidadesPorProducto = unidades.rows.map((u) => ({
      productoCod: u.producto_cod,
      nombre: u.nombre,
      unidades: u.unidades,
    }));

    res.json({
      ventasTotales: totales.rows[0].ventas,
      ivaPorPagar: totales.rows[0].iva,
      unidadesPorProducto,
      productoMasVendido: masVendido(unidadesPorProducto),
      siguienteConsecutivo: consecutivo.rows[0].siguiente,
    });
  });

  return router;
}

// El de más unidades. Si hay empate, el código menor (igual que el motor),
// para que siempre haya una sola respuesta. null si no hay ventas.
function masVendido(lista) {
  let mejor = null;
  for (const p of lista) {
    if (!mejor || p.unidades > mejor.unidades) mejor = p; // la lista viene ordenada por código
  }
  return mejor;
}

export { rutasReportes };
