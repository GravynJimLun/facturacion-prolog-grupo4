// MOTOR FALSO (docs/CONTRATO.md §3.5)
//
// Sirve para desarrollar y probar el backend y el front end mientras el
// motor real (api/src/motor/, a cargo de Gravyn) no esté listo.
// Devuelve JSON con la MISMA FORMA que el motor real, pero NO aplica las
// reglas del negocio: no hay descuentos, todo paga 13 % de IVA y no se
// revisa el stock ni el crédito. Los números NO son correctos.
//
// Se elige con la variable de entorno MOTOR=falso (es el valor por defecto).

// Precios de kits del contrato (§3.4). El motor real los calcula.
const PRECIOS_KITS_EJEMPLO = { k1: 452675, k2: 453791.25 };

async function preciosKits({ kits }) {
  const precios = {};
  for (const kit of kits) precios[kit.cod] = PRECIOS_KITS_EJEMPLO[kit.cod] ?? 0;
  return precios;
}

async function calcularFactura({ lineas, productos, kits }) {
  // El único error que simula: una factura sin líneas.
  if (lineas.length === 0) {
    return {
      estado: 'rechazada',
      subtotal: null,
      iva: null,
      total: null,
      lineas: [],
      consumoStock: [],
      errores: [
        { codigo: 'factura_sin_lineas', mensaje: 'La factura no tiene líneas. (motor falso)' },
      ],
    };
  }

  const precioProducto = new Map(productos.map((p) => [p.cod, p]));
  const precioKit = await preciosKits({ kits });

  const detalle = lineas.map(({ productoCod, cantidad }) => {
    const producto = precioProducto.get(productoCod);
    const precioUnitario = producto ? producto.precio : (precioKit[productoCod] ?? 0);
    const base = Math.round(precioUnitario * cantidad);
    return {
      productoCod,
      cantidad,
      categoria: producto ? producto.categoria : 'general',
      precioUnitario,
      descVolumen: 0,
      descCliente: 0,
      base,
      tarifaIva: 13,
      iva: Math.round(base * 0.13),
    };
  });

  const subtotal = detalle.reduce((s, l) => s + l.base, 0);
  const iva = detalle.reduce((s, l) => s + l.iva, 0);

  return {
    estado: 'emitida',
    subtotal,
    iva,
    total: subtotal + iva,
    lineas: detalle,
    // Solo descuenta los productos sueltos; los kits no se expanden.
    consumoStock: detalle
      .filter((l) => precioProducto.has(l.productoCod))
      .map((l) => ({ productoCod: l.productoCod, cantidad: l.cantidad })),
    errores: [],
  };
}

export { calcularFactura, preciosKits };
