// Elige el motor según la variable de entorno MOTOR (docs/CONTRATO.md §3.5):
//   MOTOR=falso  -> api/src/motor-falso.js (por defecto)
//   MOTOR=real   -> api/src/motor/index.js (motor Prolog con swipl-wasm, de Gravyn)
// Los dos exportan las mismas funciones: calcularFactura, preciosKits,
// validarProducto y validarEliminarProducto.

async function cargarMotor(tipo) {
  if (tipo === 'real') {
    try {
      return await import('./motor/index.js');
    } catch (err) {
      throw new Error(
        `MOTOR=real, pero no se pudo cargar api/src/motor/index.js: ${err.message}`,
        { cause: err },
      );
    }
  }
  return import('./motor-falso.js');
}

export { cargarMotor };
