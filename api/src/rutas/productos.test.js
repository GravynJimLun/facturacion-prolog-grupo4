// Pruebas de las rutas de productos: npm test (desde api/).
// Usan el motor Prolog REAL y una base de datos simulada en memoria (no
// tocan Neon), así corren igual en la computadora y en GitHub Actions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearApp } from '../app.js';
import * as motor from '../motor/index.js';
import { productos as productosEjemplo, kits as kitsEjemplo } from '../motor/datos-ejemplo.js';

// Base de datos falsa: responde solo las consultas que usan estas rutas.
// `secuencia` imita productos_cod_seq de sql/004: el INSERT sin código
// recibe 'p' + el número siguiente.
function crearDbFalsa({ secuencia = 7 } = {}) {
  const productos = productosEjemplo.map((p) => ({ ...p, activo: true }));
  let ultimo = secuencia;
  const kits = kitsEjemplo.map((k) => ({ ...k, nombre: `kit_${k.cod}` }));
  const columnas = ({ cod, nombre, categoria, precio, stock }) => ({ cod, nombre, categoria, precio, stock });

  return {
    productos,
    async query(sql, params = []) {
      const texto = sql.trim();
      if (texto.startsWith('SELECT') && texto.includes('FROM productos')) {
        const incluirInactivos = params[0];
        return {
          rows: productos
            .filter((p) => incluirInactivos || p.activo)
            .map((p) => (incluirInactivos ? { ...columnas(p), activo: p.activo } : columnas(p))),
        };
      }
      if (texto.startsWith('SELECT') && texto.includes('FROM kits')) return { rows: kits };
      if (texto.startsWith('INSERT INTO productos')) {
        const [nombre, categoria, precio, stock] = params;
        const cod = `p${++ultimo}`;
        if (productos.some((p) => p.cod === cod)) throw Object.assign(new Error('duplicado'), { code: '23505' });
        const fila = { cod, nombre, categoria, precio, stock, activo: true };
        productos.push(fila);
        return { rows: [columnas(fila)] };
      }
      if (texto.startsWith('UPDATE productos SET nombre')) {
        const [cod, nombre, categoria, precio, stock] = params;
        const p = productos.find((x) => x.cod === cod && x.activo);
        if (!p) return { rows: [] };
        Object.assign(p, { nombre, categoria, precio, stock });
        return { rows: [columnas(p)] };
      }
      if (texto.startsWith('UPDATE productos SET activo = false')) {
        productos.find((x) => x.cod === params[0]).activo = false;
        return { rows: [] };
      }
      throw new Error(`Consulta no simulada: ${texto}`);
    },
  };
}

// Levanta la app en un puerto libre y devuelve una función para pedirle.
async function conApp(fn, opcionesDb) {
  const db = crearDbFalsa(opcionesDb);
  const servidor = crearApp({ db, motor, origenesCors: [] }).listen(0);
  await new Promise((ok) => servidor.once('listening', ok));
  const base = `http://localhost:${servidor.address().port}/api/productos`;
  const pedir = async (metodo, ruta = '', cuerpo) => {
    const r = await fetch(base + ruta, {
      method: metodo,
      headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    return { status: r.status, cuerpo: r.status === 204 ? null : await r.json() };
  };
  try {
    await fn(pedir, db);
  } finally {
    servidor.close();
  }
}

const cafe = { nombre: 'cafe_molido', categoria: 'canasta', precio: 3500, stock: 40 };

test('GET: productos activos y kits, sin el campo activo', async () => {
  await conApp(async (pedir) => {
    const { status, cuerpo } = await pedir('GET');
    assert.equal(status, 200);
    assert.equal(cuerpo.length, 9);
    assert.deepEqual(cuerpo[0], {
      cod: 'p1', nombre: 'arroz_1kg', tipo: 'producto', categoria: 'canasta', precio: 1200, stock: 200,
    });
    assert.equal(cuerpo.find((x) => x.cod === 'k2').precio, 453791.25);
  });
});

test('POST: crea un producto válido y el código lo genera la base', async () => {
  await conApp(async (pedir, db) => {
    const { status, cuerpo } = await pedir('POST', '', { ...cafe, nombre: '  cafe_molido ' });
    assert.equal(status, 201);
    assert.deepEqual(cuerpo, { cod: 'p8', ...cafe, tipo: 'producto' });
    assert.ok(db.productos.some((p) => p.cod === 'p8'));
    assert.equal((await pedir('POST', '', { ...cafe, nombre: 'te_verde' })).cuerpo.cod, 'p9');
  });
});

test('POST: no se acepta un código en el cuerpo', async () => {
  await conApp(async (pedir, db) => {
    const { status, cuerpo } = await pedir('POST', '', { ...cafe, cod: 'p50' });
    assert.equal(status, 400);
    assert.deepEqual(cuerpo.detalles, ['No mande el código: el sistema lo genera al crear el producto.']);
    assert.equal(db.productos.length, 7);
  });
});

test('POST: si la secuencia choca con un código creado a mano, prueba el siguiente', async () => {
  // La secuencia va en 6: el siguiente sería p7, que ya existe.
  await conApp(
    async (pedir) => {
      const { status, cuerpo } = await pedir('POST', '', cafe);
      assert.equal(status, 201);
      assert.equal(cuerpo.cod, 'p8');
    },
    { secuencia: 6 },
  );
});

test('POST: los errores del motor llegan con su campo', async () => {
  await conApp(async (pedir, db) => {
    const { status, cuerpo } = await pedir('POST', '', { ...cafe, nombre: 'Mouse', categoria: 'ropa', precio: 0 });
    assert.equal(status, 400);
    assert.equal(cuerpo.error, 'Datos inválidos');
    assert.deepEqual(cuerpo.errores.map((e) => [e.codigo, e.campo]), [
      ['nombre_duplicado', 'nombre'],
      ['categoria_invalida', 'categoria'],
      ['precio_invalido', 'precio'],
    ]);
    assert.deepEqual(cuerpo.detalles, cuerpo.errores.map((e) => e.mensaje));
    assert.equal(db.productos.length, 7); // no se guardó nada
  });
});

test('POST: la forma de los datos se revisa antes del motor', async () => {
  await conApp(async (pedir) => {
    const { status, cuerpo } = await pedir('POST', '', { nombre: 5, precio: '3500' });
    assert.equal(status, 400);
    assert.equal(cuerpo.detalles.length, 4); // nombre, categoria, precio y stock
    assert.equal(cuerpo.errores, undefined);
  });
});

test('PUT: actualiza sin chocar consigo mismo', async () => {
  await conApp(async (pedir) => {
    const { status, cuerpo } = await pedir('PUT', '/p4', {
      nombre: 'mouse', categoria: 'general', precio: 9000, stock: 70,
    });
    assert.equal(status, 200);
    assert.equal(cuerpo.precio, 9000);
  });
});

test('PUT: no se puede cambiar el código ni editar uno que no existe', async () => {
  await conApp(async (pedir) => {
    const cambiarCod = await pedir('PUT', '/p4', { ...cafe, cod: 'p8' });
    assert.equal(cambiarCod.status, 400);
    assert.deepEqual(cambiarCod.cuerpo.detalles, ['El código de un producto no se puede cambiar.']);
    assert.equal((await pedir('PUT', '/p99', cafe)).status, 404);
  });
});

test('DELETE: un producto que está en kits no se puede eliminar (409)', async () => {
  await conApp(async (pedir, db) => {
    const { status, cuerpo } = await pedir('DELETE', '/p2');
    assert.equal(status, 409);
    assert.equal(cuerpo.errores[0].codigo, 'producto_en_kit');
    assert.match(cuerpo.detalles[0], /k1, k2/);
    assert.equal(db.productos.find((p) => p.cod === 'p2').activo, true);
  });
});

test('DELETE: desactiva el producto y su nombre se puede volver a usar', async () => {
  await conApp(async (pedir, db) => {
    assert.equal((await pedir('DELETE', '/p1')).status, 204);
    assert.equal(db.productos.find((p) => p.cod === 'p1').activo, false); // no se borró
    assert.ok(!(await pedir('GET')).cuerpo.some((p) => p.cod === 'p1'));
    assert.equal((await pedir('DELETE', '/p1')).status, 404);

    const mismoNombre = await pedir('POST', '', { ...cafe, nombre: 'arroz_1kg' });
    assert.equal(mismoNombre.status, 201);
    assert.equal(mismoNombre.cuerpo.cod, 'p8'); // código nuevo, no reusa p1
  });
});
