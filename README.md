# Sistema de facturación con Prolog

[![Pruebas del motor Prolog](https://github.com/GravynJimLun/facturacion-prolog-grupo4/actions/workflows/pruebas-prolog.yml/badge.svg)](https://github.com/GravynJimLun/facturacion-prolog-grupo4/actions/workflows/pruebas-prolog.yml)

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
| `reglas/` | Motor de reglas en Prolog (`facturacion_datos.pl` trae los datos de ejemplo) |
| `sql/` | Script de Neon: tablas y datos de ejemplo (`facturacion_neon.sql`) |
| `api/` | Backend (API) |
| `web/` | Front end |
| `docs/` | Guía del proyecto y material de apoyo |
| `BITACORA_IA.md` | Bitácora obligatoria del uso de IA |

## Cómo correrlo

### 1. Base de datos (Neon)
1. Crear un proyecto en [Neon](https://neon.tech).
2. Abrir **SQL Editor**, pegar `sql/facturacion_neon.sql` y pulsar **Run**.
3. Después, en el mismo editor, correr `sql/002_detalle_lineas.sql`. Agrega las columnas donde se guarda el detalle calculado de cada línea.
4. Copiar `.env.example` como `.env` y poner ahí la cadena de conexión. **El archivo `.env` nunca se sube a GitHub.**

### 2. Motor de reglas (Prolog)
Requiere [SWI-Prolog](https://www.swi-prolog.org/download/stable).

```bash
# Consola con los datos de ejemplo
swipl reglas/consola.pl
?- totales_factura(2, Subtotal, Iva, Total).
?- errores_factura(5, Errores).

# Pruebas automáticas (plunit)
swipl -g run_tests -t halt reglas/pruebas.pl
```

`facturacion_reglas.pl` solo tiene las reglas; `facturacion_datos.pl` solo tiene los datos de ejemplo. Las pruebas corren solas en cada Pull Request con GitHub Actions. La verificación a mano de las facturas está en [docs/VERIFICACION.md](docs/VERIFICACION.md).

### 3. Backend
Requiere Node.js 22 o superior. Con el `.env` listo en la raíz del repositorio:

```bash
cd api
npm install
npm start        # http://localhost:3000/api/salud
```

Las variables de entorno y la estructura del código están en [api/README.md](api/README.md).

Para publicarlo en internet (backend en Render y front end en GitHub Pages), ver [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md).

### 4. Front end
React + Vite. Requiere Node.js 22 o superior:

```bash
cd web
npm install
npm run dev      # http://localhost:5173
```

Con `VITE_DATOS_DE_PRUEBA=true` funciona sin backend. Las pantallas, rutas y la publicación en GitHub Pages están en [web/README.md](web/README.md).

## Endpoints de la API

El formato exacto de cada petición y respuesta está en [docs/CONTRATO.md](docs/CONTRATO.md).

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/api/salud` | Comprueba que el servidor está vivo y qué motor usa | 200 |
| GET | `/api/productos` | Productos y kits (el precio del kit lo calcula el motor) | 200 |
| GET | `/api/clientes` | Lista los clientes | 200 |
| GET | `/api/facturas?estado=&cliente=` | Lista las facturas. Filtros opcionales: `estado` (`pendiente`, `emitida`, `rechazada`) y `cliente` | 200, 400 |
| GET | `/api/facturas/{id}` | Detalle de una factura con sus líneas y errores | 200, 400, 404 |
| POST | `/api/facturas` | Crea una factura pendiente con sus líneas | 201, 400 |
| POST | `/api/facturas/{id}/emitir` | Calcula la factura con el motor Prolog y guarda el resultado. Una factura **rechazada** también responde 200 | 200, 400, 404, 409 |
| GET | `/api/reportes` | Ventas totales, IVA por pagar, unidades por producto, producto más vendido y siguiente consecutivo (solo facturas emitidas) | 200 |

Todos los errores tienen el mismo formato: `{ "error": "Datos inválidos", "detalles": ["..."] }`. Un 500 solo aparece si hay un fallo real (por ejemplo, Neon no responde).

### Seguridad del backend

- La cadena de conexión solo se lee de la variable de entorno `DATABASE_URL`. Se revisó el historial de Git: nunca se subió un `.env` ni una contraseña.
- Todas las consultas usan parámetros (`$1`, `$2`…). Ningún texto del usuario se pega dentro del SQL.
- CORS solo acepta los orígenes de `CORS_ORIGIN`.
- El servidor valida todo lo que recibe (tipos, cantidades, que existan el cliente y los productos) aunque el front end ya lo haya validado.
- Emitir es una sola transacción con la factura y el stock bloqueados: dos emisiones simultáneas no pueden vender las mismas unidades.

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
