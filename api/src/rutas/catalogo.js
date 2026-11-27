// GET /api/clientes  (contrato §4.2)
// Los productos están en rutas/productos.js.
import { Router } from 'express';

function rutasCatalogo({ db }) {
  const router = Router();

  router.get('/clientes', async (req, res) => {
    const { rows } = await db.query('SELECT id, nombre, tipo, nivel FROM clientes ORDER BY id');
    res.json(rows);
  });

  return router;
}

export { rutasCatalogo };
