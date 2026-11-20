# Sistema de facturación con Prolog

Proyecto grupal del curso **SC-250 Paradigmas de Programación**, Universidad Fidélitas.

Es un sistema de facturación con cuatro piezas:

- **Motor de reglas (Prolog):** calcula IVA, descuentos y precios de kits, valida las facturas y explica los errores.
- **Base de datos (Neon, PostgreSQL):** guarda productos, clientes, facturas y líneas.
- **Backend (API):** recibe los pedidos del front end, lee y escribe en Neon y llama al motor Prolog.
- **Front end web:** pantallas para facturar y para ver reportes.

> Estado: en construcción.

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| `reglas/` | Motor de reglas (`facturacion.pl`), datos de ejemplo (`facturacion_datos.pl`) y pruebas (`pruebas_facturacion.pl`) |
| `sql/` | Script de Neon: tablas y datos de ejemplo (`facturacion_neon.sql`) |
| `api/` | Backend (API) |
| `web/` | Front end |
| `docs/` | Guía del proyecto y material de apoyo |
| `BITACORA_IA.md` | Bitácora obligatoria del uso de IA |

## Cómo correrlo

### 1. Base de datos (Neon)
1. Crear un proyecto en [Neon](https://neon.tech).
2. Abrir **SQL Editor**, pegar `sql/facturacion_neon.sql` y pulsar **Run**.
3. Copiar `.env.example` como `.env` y poner ahí la cadena de conexión. **El archivo `.env` nunca se sube a GitHub.**

### 2. Motor de reglas (Prolog)
Requiere [SWI-Prolog](https://www.swi-prolog.org/download/stable).

```bash
swipl reglas/facturacion.pl          # carga el motor y los datos de ejemplo
```

Consultas útiles:

```prolog
?- resultado_factura(2, R).          % estado, subtotal, IVA, total y errores
?- lineas_calculadas(6, L).          % detalle por línea (precio, descuentos, base, IVA)
?- errores_explicados(5, E).         % errores en lenguaje claro
?- reporte_ventas(Sub, Iva, Total).  % solo facturas emitidas
?- producto_mas_vendido(P, U).
?- siguiente_consecutivo(N).
```

Pruebas automáticas (plunit, 26 casos):

```bash
swipl -g run_tests -t halt reglas/pruebas_facturacion.pl
```

Los cálculos a mano de las 6 facturas de ejemplo están en [`docs/calculos_a_mano.md`](docs/calculos_a_mano.md).

### 3. Backend
_Por definir: tecnología, instalación y comando para arrancarlo._

### 4. Front end
_Por definir._

## Endpoints de la API

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/api/productos` | Lista los productos | 200 |
| GET | `/api/clientes` | Lista los clientes | 200 |
| GET | `/api/facturas` | Lista las facturas | 200 |
| GET | `/api/facturas/{id}` | Detalle de una factura con sus líneas | 200, 404 |
| POST | `/api/facturas` | Crea una factura con sus líneas | 201, 400 |
| POST | `/api/facturas/{id}/emitir` | Calcula la factura con el motor Prolog y guarda el resultado | 200, 404, 409 |
| GET | `/api/reportes` | Ventas, IVA por pagar y producto más vendido | 200 |

## Cómo trabajamos con Git

1. `git checkout main && git pull`
2. `git checkout -b nombre/tarea` (por ejemplo, `ana/reglas-iva`)
3. Hacer commits pequeños con mensajes claros.
4. `git push -u origin nombre/tarea` y abrir un **Pull Request**.
5. Otra persona revisa y aprueba el PR antes del merge. **Nadie hace push directo a `main`.**

## Integrantes

| Nombre | Usuario de GitHub | Rol principal |
|---|---|---|
| | | |

## Capturas

_Pendiente._
