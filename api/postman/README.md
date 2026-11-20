# Colección de Postman

`facturacion.postman_collection.json` tiene **29 peticiones y 62 pruebas**, positivas y negativas. Cubre las respuestas 200, 201, 400, 404 y 409. La guía §4 pide al menos 12 peticiones y 25 pruebas.

| Carpeta | Qué prueba |
|---|---|
| 1. Consultas | Productos y kits, clientes, facturas con filtros, detalle, 404, id inválido, filtro inválido y ruta inexistente |
| 2. Crear facturas | Crea 5 facturas para la carpeta 3 (201) y prueba datos inválidos, cliente o producto inexistente y JSON mal formado (400) |
| 3. Emitir | Valores de control de la guía (26.400 / 174 / 26.574), cliente exonerado, rechazos por crédito, sin líneas y sin stock, emitir dos veces (409) y factura inexistente (404) |
| 4. Reportes | Campos del contrato, producto más vendido y siguiente consecutivo |

## Cómo correrla

1. Arrancar el backend con `MOTOR=real`. Con el motor falso fallan las pruebas que revisan montos y errores del motor; esas peticiones lo dicen en su descripción.
2. En Postman: **Import** → elegir este archivo.
3. Si el backend no está en `http://localhost:3000`, cambiar la variable `baseUrl` de la colección.
4. Clic derecho en la colección → **Run collection** → **Run**. Las peticiones deben ir **en orden**, porque la carpeta 3 emite las facturas que crea la carpeta 2.

Desde la terminal también se puede correr con Newman:

```bash
npx newman run api/postman/facturacion.postman_collection.json --env-var baseUrl=http://localhost:3000
```

Se puede correr varias veces sin recargar la base de datos. Cada corrida crea facturas nuevas y descuenta 20 kg de arroz del stock (hay 200).
