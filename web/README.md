# web/: Front end

Pantallas del sistema hechas con **React + Vite** (ver [`docs/CONTRATO.md`](../docs/CONTRATO.md) §1).

## Arrancar

Requiere Node.js 22 o superior.

```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

Por defecto llama al backend en `http://localhost:3000`. Para cambiarlo, copie `web/.env.example` como `web/.env.local`:

| Variable | Para qué sirve |
|---|---|
| `VITE_API_URL` | Dirección del backend |
| `VITE_DATOS_DE_PRUEBA` | `true` = usar los JSON de `src/datos-de-prueba/` en vez del backend. Sirve para trabajar en las pantallas sin backend ni Neon |

> El backend solo acepta llamadas desde el origen de `CORS_ORIGIN`, en el `.env` de la raíz. Para desarrollo es `http://localhost:5173`.

## Pantallas y rutas

| Ruta | Pantalla | Archivo | Issue | A cargo de |
|---|---|---|---|---|
| `#/catalogo` | Catálogo con búsqueda y filtro por categoría | `paginas/Catalogo.jsx` | #19 | Armando |
| `#/nueva` | Nueva factura: cliente, forma de pago, líneas y subtotal estimado | `paginas/NuevaFactura.jsx` | #20 | Armando |
| `#/historial?estado=&cliente=` | Historial con filtros | `paginas/Historial.jsx` | #23 | Armando |
| `#/facturas/{id}/emitir` | Emitir y mostrar el resultado | `paginas/Emitir.jsx` | #21 | Gravyn |
| `#/facturas/{id}` | Detalle línea por línea | `paginas/Detalle.jsx` | #22 | Gravyn |
| `#/reportes` | Reportes con gráfico | `paginas/Reportes.jsx` | #24 | Gravyn |
| `#/productos` | Mantenimiento de productos: buscar, editar y eliminar (desactivar) | `paginas/Productos.jsx` | — | Gravyn |
| `#/productos/nuevo` y `#/productos/{cod}/editar` | Formulario de producto. Muestra junto a cada campo los errores del motor Prolog | `paginas/ProductoFormulario.jsx` | — | Gravyn |

Al guardar una factura nueva, la app lleva a `#/facturas/{id}/emitir`.

En modo de prueba (`VITE_DATOS_DE_PRUEBA=true`), las facturas viven en memoria: se pueden crear y emitir, y al recargar se vuelve a los 6 ejemplos de `datos-de-prueba/facturas-detalle.json`. Como no hay motor, una factura nueva sale emitida con los montos de ejemplo de la factura 2.

Los productos también viven en memoria: se pueden crear, editar y eliminar. Como no hay motor, el modo de prueba imita solo algunas reglas: código repetido, nombre vacío, precio, stock y producto dentro de un kit. Sus mensajes terminan en «(modo de prueba)».

## Estructura

```
src/
  main.jsx            arranque (HashRouter: las rutas usan #/ para funcionar en GitHub Pages)
  App.jsx             encabezado, menú y rutas
  api.js              TODAS las llamadas a la API, con mensajes de error amables
  usarDatos.js        hook useDatos: carga datos con estado de carga y de error
  formato.js          colones, fechas y etiquetas legibles ("consumidor_final" -> "Consumidor final")
  componentes/
    Estados.jsx       <Cargando>, <MensajeError>, <InsigniaEstado>
  paginas/            una pantalla por archivo
  datos-de-prueba/    respuestas de ejemplo de la API (formato del contrato §4)
  estilos.css
```

## Calidad de uso (issue #25)

- **Indicador de carga** en cada llamada a la API (`<Cargando>`, con `role="status"` para los lectores de pantalla).
- **Mensajes de error amables** con los detalles del backend y un botón para reintentar. Si el backend no responde, se dice eso en vez de mostrar un error técnico.
- **Validación del formulario** antes de enviar: cliente, producto y cantidad entera mayor que 0. Avisa si la cantidad supera el stock (la decisión final la toma el motor al emitir).
- **Diseño adaptable a celular**: en pantallas angostas las tablas se convierten en tarjetas y el formulario va en una columna.
- **Contraste y etiquetas**: colores con contraste AA, cada campo con su `<label>`, errores conectados con `aria-describedby`, foco visible y enlace para saltar el menú.

## Publicación

El workflow `.github/workflows/web-pages.yml` publica el sitio en GitHub Pages cada vez que cambia `web/` en `main`. El dueño del repositorio tiene que activarlo una vez: **Settings → Pages → Source: GitHub Actions**. Mientras no exista la variable `VITE_API_URL`, el sitio sale en modo de prueba.
