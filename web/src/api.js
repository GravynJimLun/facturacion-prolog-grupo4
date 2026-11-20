// TODAS las llamadas del front end a la API pasan por aquí (contrato §2).
// Las pantallas nunca usan fetch directamente: así los errores se manejan
// en un solo lugar y siempre tienen un mensaje amable.
import productos from './datos-de-prueba/productos.json';
import clientes from './datos-de-prueba/clientes.json';
import facturasDetalle from './datos-de-prueba/facturas-detalle.json';
import emitirEmitida from './datos-de-prueba/emitir-emitida.json';
import emitirRechazada from './datos-de-prueba/emitir-rechazada.json';
import reportes from './datos-de-prueba/reportes.json';

const URL_API = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const USAR_DATOS_DE_PRUEBA = import.meta.env.VITE_DATOS_DE_PRUEBA === 'true';

// Error con un mensaje listo para mostrar y, si los hay, los detalles que
// mandó el backend (por ejemplo, qué campo está mal).
class ErrorApi extends Error {
  constructor(mensaje, { status = 0, detalles = [] } = {}) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
  }
}

const MENSAJES_POR_STATUS = {
  400: 'Hay datos que revisar.',
  404: 'No encontramos lo que busca.',
  409: 'Esta acción ya se había hecho.',
  500: 'El servidor tuvo un problema. Intente de nuevo en un momento.',
};

async function pedir(ruta, { metodo = 'GET', cuerpo } = {}) {
  let respuesta;
  try {
    respuesta = await fetch(URL_API + ruta, {
      method: metodo,
      headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi(
      'No se pudo conectar con el servidor. Revise su conexión a internet o que el backend esté encendido.',
    );
  }

  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new ErrorApi(
      datos?.error || MENSAJES_POR_STATUS[respuesta.status] || 'Ocurrió un error inesperado.',
      { status: respuesta.status, detalles: datos?.detalles ?? [] },
    );
  }
  return datos;
}

// ------------------------------------------------------------ API real
const apiReal = {
  productos: () => pedir('/api/productos'),
  clientes: () => pedir('/api/clientes'),
  // filtros: { estado, cliente }; los vacíos no se mandan.
  facturas: (filtros = {}) => {
    const params = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v));
    return pedir('/api/facturas' + (params.size ? `?${params}` : ''));
  },
  factura: (id) => pedir(`/api/facturas/${encodeURIComponent(id)}`),
  crearFactura: (factura) => pedir('/api/facturas', { metodo: 'POST', cuerpo: factura }),
  emitirFactura: (id) => pedir(`/api/facturas/${encodeURIComponent(id)}/emitir`, { metodo: 'POST' }),
  reportes: () => pedir('/api/reportes'),
};

// ------------------------------------------------ API de datos de prueba
// Responde con los JSON de src/datos-de-prueba/ (mismo formato del
// contrato §4) y espera un poco, para que se vea el indicador de carga.
const esperar = (valor) => new Promise((ok) => setTimeout(() => ok(structuredClone(valor)), 400));
const fallar = (error) => new Promise((_, no) => setTimeout(() => no(error), 400));

// Las facturas viven en memoria mientras la página está abierta: crear y
// emitir las cambian, igual que el backend real. Al recargar se vuelve a
// los 6 ejemplos (sus números son los de docs/VERIFICACION.md).
const memoria = new Map(facturasDetalle.map((f) => [f.id, structuredClone(f)]));
const nombreProducto = (cod) => productos.find((p) => p.cod === cod)?.nombre ?? cod;
const noExiste = (id) => new ErrorApi(`La factura ${id} no existe.`, { status: 404 });

const resumenFactura = (f) => ({
  id: f.id,
  clienteId: f.cliente.id,
  clienteNombre: f.cliente.nombre,
  formaPago: f.formaPago,
  estado: f.estado,
  subtotal: f.subtotal,
  iva: f.iva,
  total: f.total,
  creadaEn: f.creadaEn,
});

const apiDePrueba = {
  productos: () => esperar(productos),
  clientes: () => esperar(clientes),
  facturas: ({ estado, cliente } = {}) =>
    esperar(
      [...memoria.values()]
        .map(resumenFactura)
        .filter((f) => (!estado || f.estado === estado) && (!cliente || f.clienteId === cliente)),
    ),
  factura: (id) => (memoria.has(Number(id)) ? esperar(memoria.get(Number(id))) : fallar(noExiste(id))),
  crearFactura: ({ clienteId, formaPago, lineas }) => {
    const nueva = {
      id: Math.max(...memoria.keys()) + 1,
      formaPago,
      estado: 'pendiente',
      subtotal: null,
      iva: null,
      total: null,
      creadaEn: new Date().toISOString(),
      cliente: clientes.find((c) => c.id === clienteId),
      lineas: lineas.map(({ productoCod, cantidad }) => ({
        productoCod,
        productoNombre: nombreProducto(productoCod),
        cantidad,
        categoria: null,
        precioUnitario: null,
        descVolumen: null,
        descCliente: null,
        base: null,
        tarifaIva: null,
        iva: null,
      })),
      errores: [],
    };
    memoria.set(nueva.id, nueva);
    return esperar(nueva);
  },
  // Igual que el backend: 404 si no existe, 409 si ya está emitida. Una
  // rechazada de los ejemplos se vuelve a rechazar por lo mismo; una factura
  // nueva sale emitida con los montos de emitir-emitida.json (en modo de
  // prueba no hay motor que calcule).
  emitirFactura: (id) => {
    const f = memoria.get(Number(id));
    if (!f) return fallar(noExiste(id));
    if (f.estado === 'emitida') {
      return fallar(new ErrorApi(`La factura ${id} ya fue emitida.`, { status: 409 }));
    }
    let resultado;
    if (f.estado === 'rechazada') resultado = { ...emitirRechazada, errores: f.errores };
    else if (f.lineas.length === 0) {
      resultado = {
        ...emitirRechazada,
        errores: [{ codigo: 'factura_sin_lineas', mensaje: 'La factura no tiene líneas.' }],
      };
    } else resultado = emitirEmitida;
    Object.assign(f, {
      estado: resultado.estado,
      subtotal: resultado.subtotal,
      iva: resultado.iva,
      total: resultado.total,
      errores: resultado.errores,
    });
    if (resultado.estado === 'emitida') {
      f.lineas = resultado.lineas.map((l) => ({ ...l, productoNombre: nombreProducto(l.productoCod) }));
    }
    return esperar({ ...resultado, id: f.id });
  },
  reportes: () => esperar(reportes),
};

const api = USAR_DATOS_DE_PRUEBA ? apiDePrueba : apiReal;

export { api, ErrorApi, USAR_DATOS_DE_PRUEBA };
