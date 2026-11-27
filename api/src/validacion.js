// Validación de los datos que llegan del front end.
// Regla de la guía §4: NUNCA confiar en el front end. Aunque el formulario
// ya valide, cualquiera puede mandar una petición directa (con Postman o curl).
import { datosInvalidos } from './errores.js';

const FORMAS_PAGO = ['contado', 'credito'];
const ESTADOS = ['pendiente', 'emitida', 'rechazada'];
const MAX_LINEAS = 100;
const MAX_CANTIDAD = 1_000_000;
const MAX_ID = 2_147_483_647; // tope de INTEGER/SERIAL en PostgreSQL

const esTextoNoVacio = (v) => typeof v === 'string' && v.trim() !== '' && v.length <= 50;

// Id de factura que viene en la URL: /api/facturas/{id}
function validarIdFactura(texto) {
  const id = /^\d{1,10}$/.test(texto) ? Number(texto) : NaN;
  if (!(id >= 1 && id <= MAX_ID)) {
    throw datosInvalidos(['El id de la factura debe ser un número entero positivo.']);
  }
  return id;
}

// Filtros de GET /api/facturas?estado=&cliente=
function validarFiltrosFacturas(query) {
  const detalles = [];
  const { estado, cliente } = query;

  if (estado !== undefined && !ESTADOS.includes(estado)) {
    detalles.push(`El filtro estado debe ser uno de: ${ESTADOS.join(', ')}.`);
  }
  if (cliente !== undefined && !esTextoNoVacio(cliente)) {
    detalles.push('El filtro cliente debe ser el id de un cliente, por ejemplo c1.');
  }
  if (detalles.length) throw datosInvalidos(detalles);
  return { estado: estado ?? null, cliente: cliente ?? null };
}

// Cuerpo de POST /api/facturas. Solo revisa la FORMA de los datos; que el
// cliente y los productos existan se revisa contra Neon en la ruta.
// No se valida stock, crédito ni que haya líneas: eso lo decide el motor
// al emitir (contrato §4.6).
function validarNuevaFactura(cuerpo) {
  if (typeof cuerpo !== 'object' || cuerpo === null || Array.isArray(cuerpo)) {
    throw datosInvalidos(['El cuerpo debe ser un objeto JSON con clienteId, formaPago y lineas.']);
  }

  const detalles = [];
  const { clienteId, formaPago, lineas } = cuerpo;

  if (!esTextoNoVacio(clienteId)) {
    detalles.push('clienteId es obligatorio y debe ser texto, por ejemplo "c1".');
  }
  if (!FORMAS_PAGO.includes(formaPago)) {
    detalles.push('formaPago debe ser "contado" o "credito".');
  }

  if (!Array.isArray(lineas)) {
    detalles.push('lineas es obligatorio y debe ser una lista (puede estar vacía).');
  } else if (lineas.length > MAX_LINEAS) {
    detalles.push(`Una factura puede tener como máximo ${MAX_LINEAS} líneas.`);
  } else {
    lineas.forEach((linea, i) => {
      const n = i + 1;
      if (typeof linea !== 'object' || linea === null || Array.isArray(linea)) {
        detalles.push(`La línea ${n} debe ser un objeto con productoCod y cantidad.`);
        return;
      }
      if (!esTextoNoVacio(linea.productoCod)) {
        detalles.push(`La línea ${n} necesita un productoCod de texto, por ejemplo "p1".`);
      }
      if (!Number.isInteger(linea.cantidad) || linea.cantidad < 1 || linea.cantidad > MAX_CANTIDAD) {
        detalles.push(`La cantidad de la línea ${n} debe ser un entero mayor que 0.`);
      }
    });
  }

  if (detalles.length) throw datosInvalidos(detalles);

  return {
    clienteId,
    formaPago,
    lineas: lineas.map(({ productoCod, cantidad }) => ({ productoCod, cantidad })),
  };
}

// ------------------------------------------------------------ productos
// Aquí solo se revisa la FORMA: que los campos vengan y sean del tipo
// correcto. Si el producto es válido (nombre repetido, categoría, precio
// mayor que 0, stock...) lo decide el motor Prolog (contrato §3.7).
const PATRON_COD = /^[a-z0-9_-]{1,20}$/;
const MENSAJE_COD =
  'de 1 a 20 caracteres: letras minúsculas, números, - o _ (por ejemplo "p8").';
const esNumero = (v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= MAX_ID;

// Código de producto que viene en la URL: /api/productos/{cod}
function validarCodProducto(cod) {
  if (typeof cod !== 'string' || !PATRON_COD.test(cod)) {
    throw datosInvalidos([`El código del producto debe tener ${MENSAJE_COD}`]);
  }
  return cod;
}

// Cuerpo de POST /api/productos y de PUT /api/productos/{cod}. No lleva el
// código: al crear lo genera Neon (sql/004) y al editar va en la URL.
function validarDatosProducto(cuerpo) {
  if (typeof cuerpo !== 'object' || cuerpo === null || Array.isArray(cuerpo)) {
    throw datosInvalidos(['El cuerpo debe ser un objeto JSON con nombre, categoria, precio y stock.']);
  }

  const detalles = [];
  const { nombre, categoria, precio, stock } = cuerpo;

  if (typeof nombre !== 'string' || nombre.length > 80) {
    detalles.push('nombre es obligatorio y debe ser texto de máximo 80 caracteres.');
  }
  if (typeof categoria !== 'string' || categoria.length > 30) {
    detalles.push('categoria es obligatoria y debe ser texto, por ejemplo "general".');
  }
  if (!esNumero(precio)) detalles.push('precio es obligatorio y debe ser un número.');
  if (!esNumero(stock)) detalles.push('stock es obligatorio y debe ser un número.');

  if (detalles.length) throw datosInvalidos(detalles);

  return { nombre: nombre.trim(), categoria, precio, stock };
}

export {
  validarIdFactura,
  validarFiltrosFacturas,
  validarNuevaFactura,
  validarCodProducto,
  validarDatosProducto,
};
