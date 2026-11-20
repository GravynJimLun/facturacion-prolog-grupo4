# Bitácora de uso de IA

Por cada interacción importante con la IA se registra: el prompt, lo que respondió, qué estaba mal o incompleto y cómo se corrigió.
Esta bitácora es la base de la presentación final.

---

## Entrada 1 · AAAA-MM-DD · Integrante: _nombre_

**Herramienta:** _(ChatGPT, Claude, Copilot…)_

**Prompt:**
> _Texto del prompt._

**Qué respondió la IA (resumen):**
_…_

**Qué estaba mal o incompleto:**
_…_

**Cómo lo detectamos y corregimos:**
_…_

---

## Entrada 2 · 2026-11-19 · Integrante: Gravyn

**Herramienta:** Claude Code (Claude Opus 5.5)

**Prompt:**
> «Con qué empezamos, haz todo lo que puedas». Antes de esto, en la misma sesión, se le pidió revisar la guía en PDF, crear los issues y escribir el contrato entre el motor, la API y el front end (`docs/CONTRATO.md`).

**Qué respondió la IA (resumen):**
Completó el motor (issues #2 a #8): descuento por volumen y por cliente, cálculo por línea con redondeo, cliente exonerado, totales, validaciones con mensajes, estado de la factura y reportes. Además:
- separó los datos de las reglas (`consola.pl`) y declaró los hechos como dinámicos;
- escribió 37 pruebas con plunit;
- agregó GitHub Actions para correr las pruebas en cada PR;
- escribió el cálculo a mano de las 6 facturas en `docs/VERIFICACION.md`.

**Qué estaba mal o incompleto:**
1. **La primera prueba del motor no mostró nada.** La IA puso la opción `-g` *después* del archivo (`swipl consola.pl -g ...`). En SWI-Prolog 11, todo lo que va después del archivo se toma como argumentos del script, así que la consulta nunca se ejecutó. Terminó sin error, pero no imprimió nada.
2. **Las pruebas pasaban, pero con advertencias de *choicepoint*.** Reglas como `descuento_volumen` y `precio_item` tienen varias cláusulas, y Prolog deja abierta la búsqueda de otra respuesta aunque no exista. No era una respuesta de más, pero había que comprobarlo.
3. **Al contrato le faltaba un caso.** La tabla `lineas` en Neon no tiene llave foránea hacia `productos`, así que una línea puede traer un código que no existe. El motor no tenía un error para eso: la línea se ignoraba en silencio y los totales salían mal.

**Cómo lo detectamos y corregimos:**
1. Al no ver salida, se revisó cómo SWI-Prolog lee los argumentos y se movió `-g` antes del archivo. El comando correcto quedó en el README.
2. Se agregó una prueba con `findall` que confirma que hay **una sola** respuesta (`volumen_una_sola_respuesta`, `un_solo_estado_por_factura`). Las pruebas con choicepoints esperados se marcaron con `[nondet]`, con un comentario que explica por qué.
3. Se agregó el error `producto_inexistente` al motor y al contrato, con su prueba.
4. **Cruce con el cálculo a mano:** los valores de las facturas 1, 4, 5 y 6 se calcularon a mano *antes* de correr el motor y coincidieron. Los de las facturas 2 y 3 coinciden con los valores de control de la guía.

**Verificación del integrante:**
_Pendiente: rehacer con calculadora los números de `docs/VERIFICACION.md` y poder explicar cada regla de `facturacion_reglas.pl`._

---

## Entrada 3 · 2026-11-19 · Integrante: Gravyn

**Herramienta:** Claude Code (Claude Opus 5.5)

**Prompt:**
> «Qué más podemos hacer, necesito avanzar». La IA propuso hacer el issue #34: el módulo que conecta el motor Prolog con el backend en Node, usando `swipl-wasm`.

**Qué respondió la IA (resumen):**
- `reglas/puente_json.pl`: recibe y devuelve JSON como texto, así que los datos nunca se pegan dentro de una consulta.
- `api/src/motor/index.js`, con `calcularFactura()` y `preciosKits()`.
- 10 pruebas con `node:test`.
- Un segundo trabajo en GitHub Actions que corre esas pruebas.

**Qué estaba mal o incompleto:**
1. **El contrato suponía que `swipl-wasm` tardaba «unos segundos» en arrancar.** Al medirlo, el arranque con la carga de reglas tomó unos 140 ms, y cada factura después, alrededor de 1 ms.
2. **El contrato decía que las llamadas al motor había que encolarlas.** No hace falta: la consulta es síncrona y JavaScript no puede intercalar otra en medio.
3. **La IA intentó cargar `library(http/json)`, que no existe en el build WebAssembly** (SWI-Prolog 10.1). Allí la librería se llama `library(json)`. En cambio, GitHub Actions usa SWI-Prolog 9.2, donde sigue siendo `library(http/json)`.
4. **La versión más nueva de `swipl-wasm` tenía solo 2 días publicada.** Por prudencia se fijó la 8.2.6, que llevaba 19 días.

**Cómo lo detectamos y corregimos:**
1. y 2. Antes de escribir el módulo se hizo una prueba pequeña que midió el arranque. El contrato se corrigió con los números reales (§1 y §3.6).
3. Se detectó en esa misma prueba. `puente_json.pl` carga la librería que exista, con `:- if(exists_source(library(json)))`.
4. La versión quedó fija en `package.json` (sin `^`) y en `package-lock.json`.
5. **Prueba de seguridad:** un nombre de cliente con comillas, paréntesis y `halt.` pasa por el motor sin romper la consulta.

**Verificación del integrante:**
_Pendiente: correr `npm test` en `api/` y leer `puente_json.pl` hasta poder explicarlo._

---

## Entrada 4 · 2026-11-19 · Integrante: Armando

**Herramienta:** Claude Code (Claude Opus 5.5)

**Prompt:**
> «Haz todo lo que puedas». Antes, en la misma sesión: «revisa esta carpeta», «empieza», «tráigase los cambios del git, haga aceptar, merge».

**Qué respondió la IA (resumen):**
- **Backend** (issues #11 a #16): esqueleto con Express, conexión a Neon con `pg`, motor falso, endpoints del contrato §4, validación en el servidor, transacciones y CORS. Además, la migración `sql/002_detalle_lineas.sql` (#35).
- **Colección de Postman** (#17): 29 peticiones y 62 pruebas.
- **Front end** (#18, #19, #20, #23 y #25): React + Vite, con catálogo, nueva factura e historial, datos de prueba y un workflow para GitHub Pages.

**Qué estaba mal o incompleto:**
1. **Trabajo repetido.** Al decirle «empieza», la IA escribió un motor Prolog completo (PR #38) sin revisar antes los issues ni los PR abiertos. Ese motor ya lo estaba haciendo Gravyn (PR #37). Se cerró sin merge.
2. **Pruebas que fallaban por el módulo** (en ese mismo PR #38). Las pruebas agregaban facturas con `assertz`, pero dentro del módulo de `plunit` y no en `user`, donde vive el motor. Fallaron 8 pruebas.
3. **Un commit que no funciona solo.** El commit «Agrega GET de productos y clientes» ya registra en `app.js` las rutas de facturas y reportes, que llegan en los dos commits siguientes. Si alguien hace checkout justo de ese commit, el servidor no arranca.
4. **Datos de prueba poco útiles.** Los primeros JSON de `web/src/datos-de-prueba/` se capturaron con todas las facturas pendientes, así que el historial no mostraba facturas emitidas ni rechazadas.

**Cómo lo detectamos y corregimos:**
1. Al traer los cambios de GitHub aparecieron los PR #32, #36 y #37 y los issues asignados. Se compararon los dos motores: dan los mismos números en las 6 facturas y en los reportes, así que el #38 sirvió como verificación cruzada antes de cerrarlo. **Lección:** antes de empezar una tarea, hacer `git fetch` y revisar los issues y los PR.
2. Las pruebas fallaron al correrlas. Se agregó el prefijo `user:` a `assertz` y `retractall`.
3. Se detectó al repasar el historial antes de abrir el PR. Se dejó así para no reescribir commits ya creados, pero queda anotado.
4. Se reinició la base local, se emitieron las 6 facturas y se volvieron a capturar los JSON: quedaron 4 emitidas y 2 rechazadas.

**Cómo se verificó el backend sin Neon:**
- Se levantó un PostgreSQL local temporal con los mismos scripts de `sql/`.
- Se conectó la API con el motor Prolog de Gravyn mediante un puente provisional fuera del repositorio. El motor definitivo con `swipl-wasm` es el issue #34.
- Resultados al emitir las 6 facturas de ejemplo por la API:
  - las facturas 2 y 3 dieron los valores de control de la guía;
  - `GET /api/reportes`, calculado con SQL, dio lo mismo que los reportes del motor Prolog (ventas 2.168.152, IVA 178.680).
- Tres emisiones simultáneas de la misma factura: una respondió 200, dos respondieron 409, y el stock se descontó una sola vez.
- Las pantallas se probaron con un navegador automático, en escritorio y en celular.

**Verificación del integrante:**
_Pendiente: correr la colección de Postman contra Neon y leer el código de `api/src/` hasta poder explicarlo._

---
