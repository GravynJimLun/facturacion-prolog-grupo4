// TODAS las llamadas del front end a la API pasan por aquí (contrato §2).
// Las pantallas nunca usan fetch directamente: así los errores se manejan
// en un solo lugar y siempre tienen un mensaje amable.
import productos from './datos-de-prueba/productos.json';
import clientes from './datos-de-prueba/clientes.json';
import facturas from './datos-de-prueba/facturas.json';
import factura2 from './datos-de-prueba/factura-2.json';
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

const apiDePrueba = {
  productos: () => esperar(productos),
  clientes: () => esperar(clientes),
  facturas: ({ estado, cliente } = {}) =>
    esperar(facturas.filter((f) => (!estado || f.estado === estado) && (!cliente || f.clienteId === cliente))),
  factura: (id) => esperar({ ...factura2, id: Number(id) }),
  crearFactura: ({ clienteId, formaPago, lineas }) =>
    esperar({
      ...factura2,
      id: 99,
      estado: 'pendiente',
      formaPago,
      subtotal: null,
      iva: null,
      total: null,
      cliente: clientes.find((c) => c.id === clienteId),
      lineas: lineas.map((l) => ({ ...l, productoNombre: l.productoCod })),
    }),
  // La factura 5 sale rechazada; las demás, emitidas.
  emitirFactura: (id) =>
    esperar(Number(id) === 5 ? emitirRechazada : { ...emitirEmitida, id: Number(id) }),
  reportes: () => esperar(reportes),
};

const api = USAR_DATOS_DE_PRUEBA ? apiDePrueba : apiReal;

export { api, ErrorApi, USAR_DATOS_DE_PRUEBA };
