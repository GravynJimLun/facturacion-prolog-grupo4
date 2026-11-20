// GET /api/productos y GET /api/clientes  (contrato §4.2 y §4.3)
import { Router } from 'express';
import { leerCatalogo } from '../consultas.js';

function rutasCatalogo({ db, motor }) {
  const router = Router();

  // Productos y kits juntos. El precio de cada kit lo calcula el MOTOR
  // (preciosKits), para no repetir la regla de los kits en el backend.
  router.get('/productos', async (req, res) => {
    const { productos, kits } = await leerCatalogo(db);
    const preciosKits = await motor.preciosKits({ productos, kits });

    res.json([
      ...productos.map((p) => ({ ...p, tipo: 'producto' })),
      ...kits.map((k) => ({
        cod: k.cod,
        nombre: k.nombre,
        tipo: 'kit',
        categoria: 'general',
        precio: preciosKits[k.cod] ?? null,
        stock: null,
        componentes: k.componentes,
      })),
    ]);
  });

  router.get('/clientes', async (req, res) => {
    const { rows } = await db.query('SELECT id, nombre, tipo, nivel FROM clientes ORDER BY id');
    res.json(rows);
  });

  return router;
}

export { rutasCatalogo };
