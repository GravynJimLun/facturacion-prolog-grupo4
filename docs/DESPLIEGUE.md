# Publicar el sistema

| Pieza | Dónde | Cómo se actualiza |
|---|---|---|
| Front end | GitHub Pages: <https://gravynjimlun.github.io/facturacion-prolog-grupo4/> | Solo, con cada merge a `main` que toque `web/` (workflow `web-pages.yml`) |
| Backend | Render, plan gratuito (`render.yaml`) | Solo, con cada merge a `main` que toque `api/` o `reglas/` |
| Base de datos | Neon | Scripts de `sql/`, desde el SQL Editor |

## 1. Backend en Render (una sola vez, lo hace el dueño del repositorio)

1. Entrar a <https://render.com> e iniciar sesión **con GitHub**.
2. **New → Blueprint**. Elegir el repositorio `facturacion-prolog-grupo4` y autorizar el acceso si lo pide.
3. Render lee `render.yaml` y muestra el servicio `facturacion-api`. Va a pedir **`DATABASE_URL`**: pegar ahí la cadena de conexión de Neon, la misma del `.env`. Render la guarda como secreto; **nunca se escribe en el repositorio**.
4. Pulsar **Apply**. La primera publicación tarda unos minutos.
5. Copiar la dirección que da Render (algo como `https://facturacion-api-xxxx.onrender.com`) y comprobar que `…/api/salud` responde `{"estado":"ok","motor":"real"}`.

> **Plan gratuito:** después de 15 minutos sin uso, el servicio «se duerme» y la siguiente petición tarda unos 30-50 segundos. **Antes de presentar**, abra `…/api/salud` un par de minutos antes para despertarlo.

## 2. Conectar el front end con el backend

1. En GitHub: **Settings → Secrets and variables → Actions → pestaña Variables → New repository variable**.
   - Nombre: `VITE_API_URL`
   - Valor: la dirección de Render, **sin** `/` al final.
2. **Actions → Publicar front end → Run workflow**. Al terminar, el sitio de GitHub Pages ya no está en modo de prueba: usa el backend real.

Mientras `VITE_API_URL` no exista, GitHub Pages publica el front en **modo de prueba**, con los datos de `web/src/datos-de-prueba/`.

## 3. Si algo falla

| Síntoma | Causa probable |
|---|---|
| El front dice «No se pudo conectar con el servidor» | El backend está dormido (esperar 1 minuto y reintentar) o `VITE_API_URL` está mal escrita |
| Error de CORS en la consola del navegador | `CORS_ORIGIN` en Render no es exactamente `https://gravynjimlun.github.io` |
| `/api/salud` dice `"motor":"falso"` | Falta `MOTOR=real` en las variables de Render |
| Render no arranca: «Falta DATABASE_URL» | No se pegó la cadena de Neon en el paso 1.3 |
