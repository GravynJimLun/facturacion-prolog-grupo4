// Formatos para mostrar datos (montos, fechas y nombres).

const colones = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2, // el precio de un kit puede tener decimales
});

// 26574 -> "₡26 574"; null -> "—"
const formatoColones = (monto) => (monto === null || monto === undefined ? '—' : colones.format(monto));

const fecha = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' });
const formatoFecha = (iso) => (iso ? fecha.format(new Date(iso)) : '—');

// En la base de datos los nombres vienen como "arroz_1kg" o "juan_perez".
const nombreLegible = (texto) => (texto ? texto.replaceAll('_', ' ') : '');

const ETIQUETAS = {
  // categorías
  general: 'General (13 %)',
  medicamento: 'Medicamento (2 %)',
  canasta: 'Canasta básica (1 %)',
  exento: 'Exento (0 %)',
  // tipos de cliente
  contribuyente: 'Contribuyente',
  consumidor_final: 'Consumidor final',
  exonerado: 'Exonerado',
  // niveles
  oro: 'Oro',
  plata: 'Plata',
  regular: 'Regular',
  // formas de pago
  contado: 'Contado',
  credito: 'Crédito',
  // estados
  pendiente: 'Pendiente',
  emitida: 'Emitida',
  rechazada: 'Rechazada',
};
const etiqueta = (valor) => ETIQUETAS[valor] ?? valor;

export { formatoColones, formatoFecha, nombreLegible, etiqueta };
