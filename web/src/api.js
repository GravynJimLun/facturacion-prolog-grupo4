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
// mandó el backend (por ejemplo, qué campo está mal). `errores` solo viene
// en el mantenimiento de productos: [{ codigo, campo, mensaje }] del motor
// Prolog, para marcar cada campo del formulario (contrato §4.9).
class ErrorApi extends Error {
  constructor(mensaje, { status = 0, detalles = [], errores = [] } = {}) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
    this.errores = errores;
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
      { status: respuesta.status, detalles: datos?.detalles ?? [], errores: datos?.errores ?? [] },
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
  // Mantenimiento de productos (contrato §4.9)
  crearProducto: (producto) => pedir('/api/productos', { metodo: 'POST', cuerpo: producto }),
  actualizarProducto: (cod, datos) =>
    pedir(`/api/productos/${encodeURIComponent(cod)}`, { metodo: 'PUT', cuerpo: datos }),
  eliminarProducto: (cod) => pedir(`/api/productos/${encodeURIComponent(cod)}`, { metodo: 'DELETE' }),
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
// El catálogo también vive en memoria, para poder crear, editar y eliminar.
// Un producto eliminado se desactiva: su código sigue ocupado, igual que en Neon.
const catalogo = structuredClone(productos);
const desactivados = new Set();
const nombreProducto = (cod) => catalogo.find((p) => p.cod === cod)?.nombre ?? cod;

// Imita algunas reglas del motor Prolog (contrato §3.8). Las reglas
// completas solo están en Prolog: esto es para probar la pantalla.
function validarProductoDePrueba(producto, { crear }) {
  const errores = [];
  const agregar = (codigo, campo, mensaje) =>
    errores.push({ codigo, campo, mensaje: `${mensaje} (modo de prueba)` });
  if (crear && catalogo.some((p) => p.cod === producto.cod)) {
    agregar('codigo_duplicado', 'cod', `Ya existe un producto o kit con el código ${producto.cod}.`);
  }
  if (!producto.nombre.trim()) agregar('nombre_vacio', 'nombre', 'El nombre del producto no puede estar vacío.');
  if (!Number.isInteger(producto.precio) || producto.precio <= 0) {
    agregar('precio_invalido', 'precio', 'El precio debe ser un número entero de colones mayor que cero.');
  }
  if (!Number.isInteger(producto.stock) || producto.stock < 0) {
    agregar('stock_invalido', 'stock', 'El stock debe ser un número entero mayor o igual que cero.');
  }
  return errores;
}

// Como kit_contiene/2 en Prolog: el producto está en el kit o en un kit de adentro.
const kitContiene = (kit, cod) =>
  kit.componentes.some((c) => {
    const sub = catalogo.find((k) => k.cod === c && k.tipo === 'kit');
    return c === cod || (sub !== undefined && kitContiene(sub, cod));
  });

const rechazar = (status, mensaje, errores) =>
  fallar(new ErrorApi(mensaje, { status, detalles: errores.map((e) => e.mensaje), errores }));
const productoNoExiste = (cod) => fallar(new ErrorApi(`No existe el producto ${cod}`, { status: 404 }));
const buscarActivo = (cod) =>
  catalogo.find((p) => p.cod === cod && p.tipo === 'producto' && !desactivados.has(cod));
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
  productos: () => esperar(catalogo.filter((p) => !desactivados.has(p.cod))),
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
  crearProducto: (producto) => {
    const errores = validarProductoDePrueba(producto, { crear: true });
    if (errores.length) return rechazar(400, 'Datos inválidos', errores);
    const nuevo = { ...producto, nombre: producto.nombre.trim(), tipo: 'producto' };
    catalogo.splice(catalogo.filter((p) => p.tipo === 'producto').length, 0, nuevo); // antes de los kits
    return esperar(nuevo);
  },
  actualizarProducto: (cod, datos) => {
    const p = buscarActivo(cod);
    if (!p) return productoNoExiste(cod);
    const errores = validarProductoDePrueba({ cod, ...datos }, { crear: false });
    if (errores.length) return rechazar(400, 'Datos inválidos', errores);
    Object.assign(p, datos, { nombre: datos.nombre.trim() });
    return esperar(p);
  },
  eliminarProducto: (cod) => {
    if (!buscarActivo(cod)) return productoNoExiste(cod);
    const kits = catalogo.filter((k) => k.tipo === 'kit' && kitContiene(k, cod)).map((k) => k.cod);
    if (kits.length) {
      return rechazar(409, 'No se puede eliminar el producto', [{
        codigo: 'producto_en_kit',
        campo: 'cod',
        mensaje: `No se puede eliminar ${nombreProducto(cod)} porque forma parte de estos kits: ${kits.join(', ')}. (modo de prueba)`,
      }]);
    }
    desactivados.add(cod);
    return esperar(null);
  },
};

const api = USAR_DATOS_DE_PRUEBA ? apiDePrueba : apiReal;

export { api, ErrorApi, USAR_DATOS_DE_PRUEBA };
