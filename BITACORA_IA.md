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
