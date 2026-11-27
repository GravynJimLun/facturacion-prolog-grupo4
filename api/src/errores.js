// Manejo de errores con el formato del contrato (§4.1):
//   { "error": "Mensaje", "detalles": ["...", "..."] }   (detalles es opcional)
// Los errores del motor en el mantenimiento de productos traen además
// "errores": [{ codigo, campo, mensaje }], para marcar cada campo.

// Error "esperado" con su código HTTP: 400, 404, 409...
class ErrorHttp extends Error {
  constructor(status, mensaje, detalles, errores) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
    this.errores = errores;
  }
}

const datosInvalidos = (detalles, errores) => new ErrorHttp(400, 'Datos inválidos', detalles, errores);
const noEncontrado = (mensaje) => new ErrorHttp(404, mensaje);
const conflicto = (mensaje, detalles, errores) => new ErrorHttp(409, mensaje, detalles, errores);

// Para rutas que no existen.
function rutaNoEncontrada(req, res) {
  res.status(404).json({ error: `No existe la ruta ${req.method} ${req.path}` });
}

// Middleware final de Express. Los errores esperados responden con su
// código; cualquier otro es un fallo real y responde 500 SIN mostrar
// detalles internos (pueden incluir datos de la base de datos).
// eslint-disable-next-line no-unused-vars
function manejarErrores(err, req, res, next) {
  if (err instanceof ErrorHttp) {
    const cuerpo = { error: err.message };
    if (err.detalles?.length) cuerpo.detalles = err.detalles;
    if (err.errores?.length) cuerpo.errores = err.errores;
    return res.status(err.status).json(cuerpo);
  }

  // JSON mal formado en el cuerpo de la petición (lo detecta express.json).
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'El cuerpo de la petición es demasiado grande' });
  }

  console.error(`Error en ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ error: 'Error interno del servidor. Intente de nuevo más tarde.' });
}

export { ErrorHttp, datosInvalidos, noEncontrado, conflicto, rutaNoEncontrada, manejarErrores };
