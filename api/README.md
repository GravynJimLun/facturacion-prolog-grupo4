# api/: Backend

Servidor Node.js + Express que conecta el front end con Neon (PostgreSQL) y con el motor de reglas Prolog. La tecnología está acordada en [`docs/CONTRATO.md`](../docs/CONTRATO.md) §1, y el formato de cada endpoint en §4.

## Requisitos

- Node.js 22 o superior (`node --version`)
- La base de datos de Neon creada con `sql/facturacion_neon.sql` y luego `sql/002_detalle_lineas.sql`

## Configuración

En la **raíz del repositorio** (no dentro de `api/`), copie `.env.example` como `.env` y complete los valores:

| Variable | Para qué sirve | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión de Neon. **Es una contraseña: nunca se sube a GitHub** | `postgresql://usuario:clave@host/neondb?sslmode=require` |
| `PORT` | Puerto del servidor | `3000` |
| `CORS_ORIGIN` | Origen del front end que puede llamar a la API. Se pueden poner varios, separados por coma | `http://localhost:5173` |
| `MOTOR` | `falso` (por defecto) o `real` (motor Prolog de `src/motor/`) | `falso` |

## Arrancar

```bash
cd api
npm install
npm start          # o: npm run dev  (se reinicia solo al guardar)
```

Para comprobar que está vivo: <http://localhost:3000/api/salud> → `{"estado":"ok","motor":"falso"}`

## Estructura

```
src/
  server.js        punto de entrada: lee la configuración y arranca
  config.js        variables de entorno
  db.js            conexión a Neon (pool de pg) y transacciones
  app.js           arma Express: CORS, JSON, rutas y manejo de errores
  errores.js       errores HTTP con el formato { error, detalles }
  motor.js         elige el motor según MOTOR
  motor-falso.js   motor de mentira con la misma forma que el real (§3.5)
  motor/           motor real con swipl-wasm (Gravyn, issue #34)
```

## Motor falso

`MOTOR=falso` sirve para trabajar sin el motor Prolog. Devuelve JSON con la misma forma que el motor real, pero **los números no son correctos**: no aplica descuentos, cobra 13 % de IVA en todo y solo rechaza las facturas sin líneas. Para la demo y las pruebas finales hay que usar `MOTOR=real`.
