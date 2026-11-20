// Punto de entrada del backend:  npm start  (desde la carpeta api/)
import { leerConfig } from './config.js';
import { crearDb } from './db.js';
import { cargarMotor } from './motor.js';
import { crearApp } from './app.js';

const config = leerConfig();
const db = crearDb(config.databaseUrl);
const motor = await cargarMotor(config.motor);

const app = crearApp({ db, motor, origenesCors: config.origenesCors, nombreMotor: config.motor });

const servidor = app.listen(config.puerto, () => {
  console.log(`API escuchando en http://localhost:${config.puerto}  (motor: ${config.motor})`);
  console.log(`CORS permitido para: ${config.origenesCors.join(', ')}`);
});

// Cierre ordenado (Ctrl+C o cuando el servicio de despliegue lo detiene).
for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => {
    servidor.close(() => db.cerrar().finally(() => process.exit(0)));
  });
}
