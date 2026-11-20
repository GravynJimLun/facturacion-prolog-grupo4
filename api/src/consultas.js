// Consultas a Neon que usan varias rutas. Todas con parámetros ($1, $2...).
// `db` puede ser el pool o el cliente de una transacción: los dos tienen query().

// Catálogo completo: productos y kits (con la lista de componentes).
// El motor lo necesita entero, porque un kit usa los precios y el stock de
// sus componentes (contrato §3.1).
async function leerCatalogo(db, { bloquearStock = false } = {}) {
  const productos = await db.query(
    `SELECT cod, nombre, categoria, precio, stock FROM productos ORDER BY cod
     ${bloquearStock ? 'FOR UPDATE' : ''}`,
  );
  const kits = await db.query(
    `SELECT k.cod, k.nombre,
            COALESCE(array_agg(ki.item_cod ORDER BY ki.item_cod)
                     FILTER (WHERE ki.item_cod IS NOT NULL), '{}') AS componentes
       FROM kits k
       LEFT JOIN kit_items ki ON ki.kit_cod = k.cod
      GROUP BY k.cod, k.nombre
      ORDER BY k.cod`,
  );
  return { productos: productos.rows, kits: kits.rows };
}

// Factura completa con el formato del contrato §4.5, o null si no existe.
async function leerFactura(db, id) {
  const { rows } = await db.query(
    `SELECT f.id, f.forma_pago, f.estado, f.subtotal, f.iva, f.total, f.errores, f.creada_en,
            c.id AS cliente_id, c.nombre AS cliente_nombre, c.tipo AS cliente_tipo,
            c.nivel AS cliente_nivel
       FROM facturas f
       JOIN clientes c ON c.id = f.cliente_id
      WHERE f.id = $1`,
    [id],
  );
  if (rows.length === 0) return null;
  const f = rows[0];

  const lineas = await db.query(
    `SELECT l.producto_cod, COALESCE(p.nombre, k.nombre, l.producto_cod) AS producto_nombre,
            l.cantidad, l.categoria, l.precio_unitario, l.desc_volumen, l.desc_cliente,
            l.base, l.tarifa_iva, l.iva
       FROM lineas l
       LEFT JOIN productos p ON p.cod = l.producto_cod
       LEFT JOIN kits k ON k.cod = l.producto_cod
      WHERE l.factura_id = $1
      ORDER BY l.id`,
    [id],
  );

  return {
    id: f.id,
    formaPago: f.forma_pago,
    estado: f.estado ?? 'pendiente',
    subtotal: f.subtotal,
    iva: f.iva,
    total: f.total,
    creadaEn: f.creada_en,
    cliente: { id: f.cliente_id, nombre: f.cliente_nombre, tipo: f.cliente_tipo, nivel: f.cliente_nivel },
    lineas: lineas.rows.map((l) => ({
      productoCod: l.producto_cod,
      productoNombre: l.producto_nombre,
      cantidad: l.cantidad,
      categoria: l.categoria,
      precioUnitario: l.precio_unitario,
      descVolumen: l.desc_volumen,
      descCliente: l.desc_cliente,
      base: l.base,
      tarifaIva: l.tarifa_iva,
      iva: l.iva,
    })),
    errores: leerErrores(f.errores),
  };
}

// La columna facturas.errores es TEXT y guarda la lista de errores como JSON.
function leerErrores(texto) {
  if (!texto) return [];
  try {
    const errores = JSON.parse(texto);
    return Array.isArray(errores) ? errores : [];
  } catch {
    return [{ codigo: 'desconocido', mensaje: texto }]; // texto viejo que no es JSON
  }
}

export { leerCatalogo, leerFactura };
