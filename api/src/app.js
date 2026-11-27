// Arma la aplicación Express. Recibe la base de datos y el motor desde
// afuera (server.js), así se pueden cambiar sin tocar las rutas.
import express from 'express';
import cors from 'cors';
import { manejarErrores, rutaNoEncontrada } from './errores.js';
import { rutasCatalogo } from './rutas/catalogo.js';
import { rutasFacturas } from './rutas/facturas.js';
import { rutasProductos } from './rutas/productos.js';
import { rutasReportes } from './rutas/reportes.js';

function crearApp({ db, motor, origenesCors, nombreMotor = 'falso' }) {
  const app = express();
  app.disable('x-powered-by'); // no anunciar qué servidor usamos

  // CORS limitado al sitio del front end (guía §4). Las peticiones sin
  // cabecera Origin (Postman, curl) no son de un navegador y pasan.
  app.use(
    cors({
      origin: (origen, cb) => cb(null, !origen || origenesCors.includes(origen)),
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  // Para comprobar que el servidor está vivo y qué motor usa.
  app.get('/api/salud', (req, res) => res.json({ estado: 'ok', motor: nombreMotor }));

  app.use('/api', rutasCatalogo({ db }));
  app.use('/api/productos', rutasProductos({ db, motor }));
  app.use('/api/facturas', rutasFacturas({ db, motor }));
  app.use('/api/reportes', rutasReportes({ db }));

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}

export { crearApp };
