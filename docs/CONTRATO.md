# Contrato entre motor, API y front end

Este documento fija los acuerdos que permiten que **Gravyn** (motor Prolog y pantallas de resultados) y **Armando** (backend y resto del front end) trabajen en paralelo sin esperarse.

Mientras el PR que lo agrega esté abierto, cualquiera de los dos puede proponer cambios. Después del merge, **cualquier cambio a este contrato va en su propio PR y lo aprueban los dos**, porque romperlo rompe el trabajo del otro.

---

## 1. Tecnología

| Pieza | Decisión | Por qué |
|---|---|---|
| Backend | Node.js 22 LTS o superior + Express | Lo más documentado y sencillo de desplegar gratis |
| Acceso a Neon | Paquete `pg` (node-postgres), **siempre con consultas parametrizadas** (`$1, $2…`) | Evita la inyección SQL (guía §4) |
| Motor Prolog | Paquete `swipl-wasm` dentro del backend (opción **A** de la guía) | No hay que instalar SWI-Prolog en el servidor; funciona en cualquier hosting de Node |
| Front end | React + Vite | `.env.example` ya usa el puerto 5173 de Vite; React facilita el estado de «nueva factura» |
| Gráfico | HTML y CSS, sin librería | Un `<canvas>` (como el de Chart.js) no lo puede leer un lector de pantalla; con HTML cada barra lleva su nombre y su valor como texto, y no se agrega otra dependencia |
| Despliegue | Front en GitHub Pages, backend en un servicio gratuito de Node (por ejemplo, Render) | Por confirmar cuando el backend esté listo |

Límites de la opción A, medidos con `swipl-wasm` 8.2.6 (SWI-Prolog 10.1) en Node 24 sobre Windows:
- El arranque más la carga de las reglas toma unos 140 ms, solo en la primera llamada. Cada factura después tarda alrededor de 1 ms.
- El paquete ocupa unos 14 MB en `node_modules`.
- Por ser WebAssembly, no puede usar librerías nativas de SWI-Prolog. Por ejemplo, la librería JSON se llama `library(json)` y no `library(http/json)`.

Hay que comentar estos límites en la presentación.

## 2. Quién toca qué carpeta

Cada persona trabaja solo en sus carpetas, así casi no hay conflictos de merge.

```
reglas/                         Gravyn
  facturacion_reglas.pl           reglas del negocio (sin datos)
  facturacion_datos.pl            datos de ejemplo (solo para consola y pruebas)
  pruebas.pl                      pruebas plunit
api/                            Armando (excepto src/motor/)
  package.json
  src/
    server.js, db.js, rutas/      Armando
    motor-falso.js                Armando (ver §3.4)
    motor/                        Gravyn
      index.js                      exporta calcularFactura() y preciosKits()
web/                            Armando (excepto las 3 páginas de Gravyn)
  src/
    api.js                        Armando: todas las llamadas a la API
    datos-de-prueba/              Armando: JSON de ejemplo según la §4
    paginas/
      Catalogo.jsx, NuevaFactura.jsx, Historial.jsx    Armando
      Emitir.jsx, Detalle.jsx, Reportes.jsx            Gravyn
sql/                            Armando
docs/                           Los dos
```

## 3. Contrato del motor (`api/src/motor/index.js`)

El motor es el único lugar donde se calculan descuentos, IVA, validaciones y precios de kits. **El backend no repite ninguna de esas reglas.**

### 3.1 `calcularFactura(datos)` → `Promise<Resultado>`

**Entrada.** El backend la arma leyendo Neon:

```json
{
  "factura":  { "id": 2, "clienteId": "c2", "formaPago": "contado" },
  "lineas":   [ { "productoCod": "p1", "cantidad": 10 },
                { "productoCod": "p3", "cantidad": 2 },
                { "productoCod": "p6", "cantidad": 1 } ],
  "cliente":  { "id": "c2", "nombre": "juan_perez", "tipo": "consumidor_final", "nivel": "regular" },
  "productos": [ { "cod": "p1", "nombre": "arroz_1kg", "categoria": "canasta", "precio": 1200, "stock": 200 } ],
  "kits":      [ { "cod": "k1", "componentes": ["p2", "p4", "p7"] },
                 { "cod": "k2", "componentes": ["k1", "p5"] } ]
}
```

- `productos` y `kits` traen **el catálogo completo**, no solo lo que aparece en la factura, porque un kit necesita los precios y el stock de sus componentes.
- `kits` se arma agrupando la tabla `kit_items` por `kit_cod`.

**Salida cuando la factura se emite.** Ejemplo con la factura 2, que coincide con los valores de control de la guía:

```json
{
  "estado": "emitida",
  "subtotal": 26400,
  "iva": 174,
  "total": 26574,
  "lineas": [
    { "productoCod": "p1", "cantidad": 10, "categoria": "canasta",     "precioUnitario": 1200,
      "descVolumen": 5, "descCliente": 0, "base": 11400, "tarifaIva": 1, "iva": 114 },
    { "productoCod": "p3", "cantidad": 2,  "categoria": "medicamento", "precioUnitario": 1500,
      "descVolumen": 0, "descCliente": 0, "base": 3000,  "tarifaIva": 2, "iva": 60 },
    { "productoCod": "p6", "cantidad": 1,  "categoria": "exento",      "precioUnitario": 12000,
      "descVolumen": 0, "descCliente": 0, "base": 12000, "tarifaIva": 0, "iva": 0 }
  ],
  "consumoStock": [ { "productoCod": "p1", "cantidad": 10 },
                    { "productoCod": "p3", "cantidad": 2 },
                    { "productoCod": "p6", "cantidad": 1 } ],
  "errores": []
}
```

**Salida cuando la factura se rechaza.** Ejemplo con la factura 5:

```json
{
  "estado": "rechazada",
  "subtotal": null,
  "iva": null,
  "total": null,
  "lineas": [],
  "consumoStock": [],
  "errores": [
    { "codigo": "stock_insuficiente", "productoCod": "p2",
      "mensaje": "No hay suficiente stock de laptop: se pidieron 20 y solo hay 15." }
  ]
}
```

### 3.2 Reglas de los campos

| Campo | Regla |
|---|---|
| `descVolumen`, `descCliente`, `tarifaIva` | Porcentajes enteros: 5 significa 5 % |
| `precioUnitario` | Puede tener decimales en un kit (por ejemplo, k2 = 453 791,25). No se redondea |
| `base`, `iva` de cada línea | Enteros redondeados al colón (guía §3) |
| `subtotal`, `iva`, `total` | Suma de las líneas. Son `null` si la factura es rechazada |
| `consumoStock` | Unidades de **productos** que se descuentan del stock. Los kits se expanden a sus componentes de forma recursiva. Va vacío si la factura es rechazada |
| `errores[].mensaje` | Texto en español, listo para mostrar al usuario. Lo arma Prolog |
| `errores[].productoCod` | Solo en los errores ligados a una línea |

### 3.3 Códigos de error del motor

| `codigo` | Cuándo | Ejemplo de `mensaje` |
|---|---|---|
| `factura_sin_lineas` | La factura no tiene líneas | «La factura no tiene líneas.» |
| `cantidad_invalida` | Cantidad ≤ 0 | «La cantidad de mouse debe ser mayor que cero.» |
| `stock_insuficiente` | Stock menor que lo pedido (en un kit: algún componente) | «No hay suficiente stock de laptop: se pidieron 20 y solo hay 15.» |
| `credito_no_permitido` | Crédito para un consumidor final o un cliente regular | «comercial_luna es un cliente de nivel regular y no puede comprar a crédito.» |
| `producto_inexistente` | Una línea trae un código que no es producto ni kit. La tabla `lineas` no tiene llave foránea, así que el motor también lo revisa | «El producto p99 no existe en el catálogo.» |

Una factura puede traer **varios errores a la vez**. El motor los devuelve todos, no solo el primero.

### 3.4 `preciosKits(datos)` → `Promise<{ [cod]: precio }>`

Recibe `{ productos, kits }` (el mismo formato de la §3.1) y devuelve el precio de cada kit, por ejemplo `{ "k1": 452675, "k2": 453791.25 }`. El backend lo usa en `GET /api/productos`, para que el front pueda estimar subtotales sin repetir la regla de los kits.

### 3.5 Motor falso

Mientras el motor real no esté listo, Armando usa `api/src/motor-falso.js`. Exporta las mismas cuatro funciones y devuelve los JSON de ejemplo de este documento.

El backend elige el motor con la variable de entorno `MOTOR=falso` o `MOTOR=real`. Cuando Gravyn entregue `api/src/motor/`, basta con cambiar la variable.

### 3.6 Notas de implementación (Gravyn)

- En producción los datos vienen de Neon, no de `facturacion_datos.pl`. El motor carga **solo** `facturacion_reglas.pl`, declara los hechos como `dynamic` y, en cada llamada, hace `retractall` y luego `assertz` con lo que recibe.
- Hay que sacar el `ensure_loaded(facturacion_datos)` del archivo de reglas. Para la consola y las pruebas se carga aparte.
- **Los datos nunca se pegan como texto dentro de una consulta Prolog.** Se convierten a términos con comillas seguras (por ejemplo, `format("~q", ...)` en Prolog o un escape equivalente en JS). Es el equivalente Prolog de la inyección SQL.
- En Prolog, todo el resultado sale de `resultado_factura(Id, resultado(Estado, Subtotal, Iva, Total, Lineas, ConsumoStock, Errores))`. El módulo JS lo traduce al JSON de la §3.1: `null` pasa a `null`, y un `productoCod` igual a `ninguno` se omite.
- Las facturas no se mezclan aunque lleguen dos peticiones a la vez. Cada llamada carga sus hechos y consulta en un solo paso síncrono (`once()`), y JavaScript no ejecuta otra llamada en medio. Por eso no hace falta una cola. **Regla para quien toque `api/src/motor/`:** no poner ningún `await` entre la carga de los hechos y la consulta.
- Los datos entran y salen como texto JSON a través de `reglas/puente_json.pl` (`calcular_factura_json/2` y `precios_kits_json/2`).

### 3.7 Mantenimiento de productos: `validarProducto(datos)` y `validarEliminarProducto(datos)`

El backend **no decide** si un producto es válido: antes de guardar en Neon le pregunta al motor. Las reglas están en `reglas/facturacion_reglas.pl` §10.

**`validarProducto`.** Se llama antes de `POST /api/productos` (`operacion: "crear"`) y de `PUT /api/productos/{cod}` (`operacion: "actualizar"`):

```json
{
  "operacion": "crear",
  "producto":  { "nombre": "cafe_molido", "categoria": "canasta", "precio": 3500, "stock": 40 },
  "productos": [ { "cod": "p4", "nombre": "mouse", "categoria": "general", "precio": 8500, "stock": 80, "activo": false } ],
  "kits":      [ { "cod": "k1", "componentes": ["p2", "p4", "p7"] } ]
}
```

- `producto.cod` es **opcional**. Al crear no se manda, porque el código lo genera Neon al guardar (§4.9). Al actualizar sí va.
- `productos` es el catálogo **completo, con los desactivados**. El nombre de un producto desactivado se puede volver a usar.
- `activo` es opcional. Si no viene, el producto cuenta como activo.

**`validarEliminarProducto`.** Se llama antes de `DELETE /api/productos/{cod}`, con la entrada `{ "cod": "p2", "productos": [...], "kits": [...] }`.

**Las dos funciones devuelven lo mismo:**

```json
{
  "valido": false,
  "errores": [
    { "codigo": "producto_en_kit", "campo": "cod",
      "mensaje": "No se puede eliminar laptop porque forma parte de estos kits: k1, k2." }
  ]
}
```

`campo` es el dato del formulario que hay que corregir. El front lo usa para marcar ese campo. Igual que con las facturas, el motor devuelve **todos** los errores juntos.

### 3.8 Códigos de error de productos

| `codigo` | `campo` | Cuándo | Ejemplo de `mensaje` |
|---|---|---|---|
| `codigo_duplicado` | `cod` | Al crear **con** un código que ya es de un producto (aunque esté desactivado) o de un kit. La API ya no manda código al crear, así que con ella no aparece; la regla queda para la consola y las pruebas | «Ya existe un producto o kit con el código p1.» |
| `nombre_vacio` | `nombre` | El nombre está vacío o tiene solo espacios | «El nombre del producto no puede estar vacío.» |
| `nombre_duplicado` | `nombre` | Otro producto **activo** ya tiene ese nombre, sin contar mayúsculas ni espacios de más | «Ya existe un producto llamado mouse (código p4).» |
| `categoria_invalida` | `categoria` | La categoría no tiene tarifa de IVA (`tarifa_iva/2`) | «La categoría ropa no existe. Use una de estas: general, medicamento, canasta, exento.» |
| `precio_invalido` | `precio` | No es un entero mayor que 0 | «El precio debe ser un número entero de colones mayor que cero.» |
| `stock_invalido` | `stock` | No es un entero mayor o igual que 0 | «El stock debe ser un número entero mayor o igual que cero.» |
| `producto_en_kit` | `cod` | Al eliminar, el producto está dentro de un kit, directamente o dentro de otro kit (regla recursiva `kit_contiene/2`) | «No se puede eliminar laptop porque forma parte de estos kits: k1, k2.» |

## 4. Contrato de la API

### 4.1 Convenciones

- JSON en `camelCase`. Neon usa `snake_case` y el backend traduce.
- Los montos van en colones enteros, excepto el precio unitario de los kits.
- Estados de factura: `pendiente` (creada sin emitir; en Neon `estado` es `NULL`), `emitida` o `rechazada`.
- Formato de error, igual en todos los endpoints:

```json
{ "error": "Datos inválidos", "detalles": ["La cantidad de la línea 2 debe ser un entero mayor que 0."] }
```

`detalles` es opcional. Cuando el error viene del motor en el mantenimiento de productos (§4.9), la respuesta trae además `errores: [{ codigo, campo, mensaje }]`, para que el front marque cada campo.

### 4.2 Endpoints

| Método y ruta | Respuestas | Notas |
|---|---|---|
| `GET /api/productos` | 200 | Productos y kits (§4.3) |
| `GET /api/clientes` | 200 | `[{ id, nombre, tipo, nivel }]` |
| `GET /api/facturas?estado=&cliente=` | 200 | Ambos filtros son opcionales (§4.4) |
| `GET /api/facturas/{id}` | 200, 404 | Factura con su cliente, líneas y errores (§4.5) |
| `POST /api/facturas` | 201, 400 | Crea la factura en estado `pendiente` (§4.6) |
| `POST /api/facturas/{id}/emitir` | 200, 404, 409 | Llama al motor y guarda el resultado (§4.7) |
| `GET /api/reportes` | 200 | §4.8 |
| `POST /api/productos` | 201, 400 | Crea un producto, si el motor lo aprueba. El código lo genera Neon (§4.9) |
| `PUT /api/productos/{cod}` | 200, 400, 404 | Actualiza un producto. El código no cambia (§4.9) |
| `DELETE /api/productos/{cod}` | 204, 404, 409 | Desactiva un producto (§4.9) |

### 4.3 `GET /api/productos`

```json
[
  { "cod": "p1", "nombre": "arroz_1kg", "tipo": "producto", "categoria": "canasta", "precio": 1200, "stock": 200 },
  { "cod": "k1", "nombre": "kit_oficina", "tipo": "kit", "categoria": "general", "precio": 452675, "stock": null,
    "componentes": ["p2", "p4", "p7"] }
]
```

### 4.4 `GET /api/facturas`

```json
[
  { "id": 2, "clienteId": "c2", "clienteNombre": "juan_perez", "formaPago": "contado",
    "estado": "emitida", "subtotal": 26400, "iva": 174, "total": 26574, "creadaEn": "2026-11-19T15:30:00Z" }
]
```

Valores de los filtros: `estado` puede ser `pendiente`, `emitida` o `rechazada`; `cliente` es el id del cliente.

### 4.5 `GET /api/facturas/{id}`

```json
{
  "id": 2, "formaPago": "contado", "estado": "emitida",
  "subtotal": 26400, "iva": 174, "total": 26574, "creadaEn": "2026-11-19T15:30:00Z",
  "cliente": { "id": "c2", "nombre": "juan_perez", "tipo": "consumidor_final", "nivel": "regular" },
  "lineas": [
    { "productoCod": "p1", "productoNombre": "arroz_1kg", "cantidad": 10, "categoria": "canasta",
      "precioUnitario": 1200, "descVolumen": 5, "descCliente": 0, "base": 11400, "tarifaIva": 1, "iva": 114 }
  ],
  "errores": []
}
```

- En una factura `pendiente`, las líneas solo traen `productoCod`, `productoNombre` y `cantidad`; los campos calculados vienen en `null`.
- El detalle de cada línea **se guarda al emitir** (§5). Al consultar no se recalcula, porque el stock ya cambió.

### 4.6 `POST /api/facturas`

Cuerpo de la petición:

```json
{ "clienteId": "c2", "formaPago": "contado",
  "lineas": [ { "productoCod": "p1", "cantidad": 10 } ] }
```

Validaciones del servidor (400 si fallan):
- `clienteId` existe en Neon.
- `formaPago` es `contado` o `credito`.
- `lineas` es un arreglo, y cada `productoCod` existe como producto o como kit.
- `cantidad` es un entero mayor que 0.

Lo que **no** se valida aquí: el stock, el crédito ni que haya líneas. Eso lo decide el motor al emitir. Se permite crear una factura con `lineas: []`, para que el motor la rechace por `factura_sin_lineas`.

Respuesta: **201** con el mismo formato de §4.5 (estado `pendiente`) y la cabecera `Location: /api/facturas/{id}`.

### 4.7 `POST /api/facturas/{id}/emitir`

1. **404** si la factura no existe. **409** si ya está `emitida`. Una factura `rechazada` se puede volver a emitir, porque el stock pudo haber cambiado.
2. Lee la factura, las líneas, el cliente y el catálogo, y llama a `calcularFactura`.
3. En **una sola transacción**:
   - guarda `estado`, `subtotal`, `iva`, `total` y `errores` (como JSON en la columna de texto) en `facturas`;
   - guarda el detalle de cada línea en `lineas`;
   - si quedó `emitida`, descuenta el stock según `consumoStock`.
4. Responde **200** con `{ "id": 2, ...Resultado del motor }`.

**Una factura rechazada responde 200, no 400.** La petición se procesó bien; lo que dice que no es la regla del negocio.

### 4.8 `GET /api/reportes`

```json
{
  "ventasTotales": 26574,
  "ivaPorPagar": 174,
  "unidadesPorProducto": [ { "productoCod": "p1", "nombre": "arroz_1kg", "unidades": 10 } ],
  "productoMasVendido": { "productoCod": "p1", "nombre": "arroz_1kg", "unidades": 10 },
  "siguienteConsecutivo": 7
}
```

- Solo cuentan las facturas **emitidas**. Las unidades se agrupan por el código de la línea, así que un kit cuenta como kit.
- Se calcula con SQL sobre Neon, sin el motor.
- Los reportes del motor Prolog (#8) deben dar **los mismos números** con los datos de ejemplo. Es una buena verificación cruzada para el informe.

### 4.9 Mantenimiento de productos: `POST`, `PUT` y `DELETE /api/productos`

**Cada petición pasa por tres capas:**

1. `validacion.js` revisa la **forma**: que vengan los campos y el tipo de cada uno. El código de la URL tiene que tener de 1 a 20 caracteres: minúsculas, números, `-` o `_`.
2. El **motor Prolog** revisa las **reglas** (§3.7): duplicados, categoría, precio, stock y kits.
3. **Neon** guarda el producto con una consulta con parámetros. La llave primaria y los `CHECK` de la tabla quedan como última defensa.

**`POST /api/productos`** recibe `{ "nombre": "cafe_molido", "categoria": "canasta", "precio": 3500, "stock": 40 }`, **sin código**.
- El código lo genera Neon con la secuencia `productos_cod_seq` (`sql/004_codigo_productos.sql`): `p` + el número siguiente.
  - Es atómica: dos productos creados al mismo tiempo reciben códigos distintos.
  - Nunca repite un número, ni siquiera el de un producto desactivado. Puede dejar huecos, por ejemplo si se borra una fila a mano.
  - Si la secuencia llega a un código que alguien creó a mano, la llave primaria lo rechaza y el backend prueba con el número siguiente.
- Si el cuerpo trae `cod`, responde 400: «No mande el código: el sistema lo genera al crear el producto.».
- **201:** el producto creado, con su código nuevo y el formato de §4.3.
- **400:** el motor lo rechazó:

```json
{
  "error": "Datos inválidos",
  "detalles": ["Ya existe un producto llamado mouse (código p4).", "La categoría ropa no existe. Use una de estas: general, medicamento, canasta, exento."],
  "errores": [
    { "codigo": "nombre_duplicado",   "campo": "nombre",    "mensaje": "Ya existe un producto llamado mouse (código p4)." },
    { "codigo": "categoria_invalida", "campo": "categoria", "mensaje": "La categoría ropa no existe. Use una de estas: general, medicamento, canasta, exento." }
  ]
}
```

**`PUT /api/productos/{cod}`** recibe `{ nombre, categoria, precio, stock }`. Se mandan todos los campos.
- El código **no se puede cambiar**, porque las facturas viejas lo usan. Si el cuerpo trae un `cod` distinto, responde 400.
- 404 si el producto no existe o está desactivado.

**`DELETE /api/productos/{cod}`** **desactiva** el producto: no borra la fila.
- **204:** el producto se desactivó.
- **404:** el producto no existe o ya estaba desactivado.
- **409:** el motor no permite eliminarlo, con el mismo formato de `detalles` y `errores` (por ejemplo, `producto_en_kit`).

**Qué pasa con un producto desactivado:**
- Desaparece de `GET /api/productos`.
- Ya no se puede poner en una factura nueva.
- Una factura pendiente que ya lo tenía se rechaza al emitir, con `producto_inexistente`.
- Las facturas viejas siguen mostrando su nombre.

## 5. Cambio en la base de datos (Armando)

Hay que guardar el detalle por línea. Se agrega `sql/002_detalle_lineas.sql`:

```sql
ALTER TABLE lineas
  ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC,
  ADD COLUMN IF NOT EXISTS categoria       TEXT,
  ADD COLUMN IF NOT EXISTS desc_volumen    INTEGER,
  ADD COLUMN IF NOT EXISTS desc_cliente    INTEGER,
  ADD COLUMN IF NOT EXISTS base            INTEGER,
  ADD COLUMN IF NOT EXISTS tarifa_iva      INTEGER,
  ADD COLUMN IF NOT EXISTS iva             INTEGER;
```

## 6. Forma de trabajar

- **Ramas:** `gravyn/<tarea>` y `armando/<tarea>`, siempre desde `main` actualizado. Nadie hace push directo a `main`.
- **Commits:** en español, en imperativo y pequeños. Por ejemplo: «Agrega descuento por volumen».
- **Pull Requests:** cada PR menciona su issue con `Closes #N`, y lo aprueba la otra persona. La revisión debe dejarnos capaces de explicar el código, no solo de darle «Approve».
- **Bitácora:** cada uno agrega sus entradas en `BITACORA_IA.md` dentro del mismo PR donde usó la IA.
- **Secretos:** `.env` nunca se sube. La cadena de Neon se comparte por un canal privado.
