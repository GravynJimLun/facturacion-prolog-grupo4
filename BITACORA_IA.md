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

## Entrada 4 · 2026-11-19 · Integrante: Gravyn

**Herramienta:** Claude Code (Claude Opus 5.5)

**Prompt:**
> «Sí, toma el #18 y haz las pantallas del front».

**Qué respondió la IA (resumen):**
Iba a tomar el #18, pero al revisar el repositorio vio que Armando ya lo había hecho en `armando/front-base`. Devolvió el issue y construyó las tres pantallas de Gravyn sobre esa base:
- **Emitir (#21):** muestra el resultado, los errores en lenguaje claro y el caso 409.
- **Detalle (#22):** cada línea con el descuento explicado.
- **Reportes (#24):** tarjetas y un gráfico de barras accesible.

Además, mejoró el modo de prueba para que crear y emitir cambien las facturas en memoria.

**Qué estaba mal o incompleto:**
1. **La IA reasignó el #18 sin revisar antes las ramas del repositorio.** Casi se duplica trabajo por segunda vez; la primera fue el motor que hicimos los dos (PR #38).
2. **Había un error en la pantalla de emitir.** Al pasar de «Emitir factura 5» a «Emitir factura 2» sin recargar, se seguía mostrando el rechazo de la factura 5. React reutilizaba el mismo componente y conservaba su estado.
3. **En el modo de prueba, cualquier factura mostraba los datos de la factura 2.** Como ese modo es el que se publica en GitHub Pages, la demo pública se veía mal.
4. **Una captura de celular mostró la página desbordada, pero era falso.** Edge en modo headless no achica la ventana a menos de unos 500 px.

**Cómo lo detectamos y corregimos:**
1. Se devolvió el #18 a Armando, con un comentario aclarando el cambio. **Lección para el equipo:** antes de empezar un issue, revisar las ramas (`git fetch` y `git branch -r`).
2. Se detectó con un script que maneja Edge, pulsa los botones y toma capturas. Se corrigió con `key={id}`, que crea la pantalla de cero para cada factura.
3. Se generó `facturas-detalle.json` con las 6 facturas, comprobando que la suma de las líneas cuadra con los totales. El modo de prueba ahora guarda las facturas en memoria y responde 404 y 409 como el backend.
4. Se repitió la prueba simulando un celular de 390 px desde el protocolo de depuración: 0 px de desborde en todas las pantallas.

**Verificación del integrante:**
_Pendiente: probar las tres pantallas con `npm run dev` y el backend encendido, con `MOTOR=real`._

---
