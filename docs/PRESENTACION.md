# Presentación final: borrador

Guía §8: **10 minutos** de presentación y 3 de preguntas. Este archivo es el guion. Las diapositivas se arman a partir de él.

> ✏️ = lo tiene que completar o confirmar el grupo antes de presentar.

| # | Diapositiva | Tiempo | Quién ✏️ |
|---|---|---|---|
| 1 | Portada | 0:20 | |
| 2 | Qué hace el sistema | 0:40 | |
| 3 | Arquitectura | 1:30 | |
| 4–5 | Demo en vivo | 3:00 | |
| 6 | Retos y cómo los resolvimos | 1:40 | |
| 7 | Dónde se equivocó la IA | 1:20 | |
| 8 | Qué cambiaríamos | 0:40 | |
| 9 | Reparto del trabajo | 0:30 | |
| 10 | Cierre y enlaces | 0:20 | |

---

## 1. Portada
- **Sistema de facturación con reglas en Prolog**
- SC-250 Paradigmas de Programación · Universidad Fidélitas · Grupo 4
- ✏️ Nombres de los integrantes

## 2. Qué hace el sistema
- Factura productos y **kits**, que pueden contener otros kits.
- Calcula el **IVA** por categoría, los **descuentos** por volumen y por nivel de cliente, y aplica la **exoneración**.
- **Valida** cada factura y explica los errores en lenguaje claro.
- **Reportes:** ventas, IVA por pagar y producto más vendido.
- Toda la lógica del negocio está en **Prolog**; el resto del sistema solo guarda y muestra.

## 3. Arquitectura
Diagrama: [`docs/ARQUITECTURA.md`](ARQUITECTURA.md). Para la diapositiva, exportarlo como imagen en <https://mermaid.live>.

Qué contar:
- El recorrido de una factura: React → Express → Neon, y el motor Prolog que corre **dentro** del backend con `swipl-wasm` (opción A de la guía).
- Por qué la opción A: no hay que instalar Prolog en el servidor. Medido: unos 140 ms de arranque y 1 ms por factura.
- Los datos entran a Prolog como JSON, nunca pegados en la consulta: es el equivalente de la inyección SQL.

## 4–5. Demo en vivo
Preparación: base de datos recién cargada y todas las facturas de ejemplo emitidas. **Tener capturas de respaldo** por si falla internet.

**Factura válida.** Nueva factura → `tienda_sol` (oro), contado:
- 12 × mouse: tiene 5 % por volumen y luego 10 % por ser oro → base 87.210, IVA 11.337.
- 1 × kit oficina con soporte (k2, que contiene a k1) → base 408.412, IVA 53.094.
- **Al emitir:** subtotal 495.622, IVA 64.431, **total 560.053**.

  _(Verificado con el motor real.)_
- Mostrar el detalle línea por línea y que el stock bajó en el catálogo.

**Factura rechazada.** Nueva factura → `juan_perez` (consumidor final), **crédito**, 20 laptops:
- **Al emitir:** queda **rechazada con dos errores a la vez**:
  - «No hay suficiente stock de laptop: se pidieron 20 y solo hay 12».
  - «juan_perez es consumidor final y no puede comprar a crédito».
- Mostrar el historial filtrado por «Rechazada».

Si sobra tiempo: emitir de nuevo la factura válida para mostrar el **409**.

## 6. Retos y cómo los resolvimos (la guía pide 3 como mínimo)
1. **Dos personas hicieron el mismo motor.** El PR #38 repitió el trabajo del #37.
   - *Solución:* un contrato (`docs/CONTRATO.md`) con quién toca qué carpeta e issues asignados. Además, revisar los PR abiertos antes de empezar.
   - *Lo bueno:* los dos motores dieron los mismos números, y eso sirvió como verificación cruzada.
2. **La «trampa conocida» del no determinismo.**
   - Reglas como `descuento_volumen` podían dar más de una respuesta.
   - *Solución:* rangos que no se solapan, y pruebas que verifican una sola respuesta por factura.
3. **Conflicto de merge en `api/package.json`.** El motor (#39) y el backend (#40) crearon el mismo archivo.
   - *Solución:* unir las dependencias de los dos y volver a correr todas las pruebas.
4. **Probar el backend sin tocar Neon.**
   - *Solución:* un PostgreSQL local con los mismos scripts, y una colección de Postman con 62 pruebas que se puede correr muchas veces.
5. **Dos «emitir» al mismo tiempo podían vender el mismo stock.**
   - *Solución:* una transacción que bloquea la factura y el stock (`FOR UPDATE`). Probado: una emisión respondió 200 y las otras 409.

✏️ Elegir los 3 o 4 que mejor puedan explicar, y agregar alguno de equipo si lo hubo.

## 7. Dónde se equivocó la IA (bitácora, entradas 2 a 4)

| Error de la IA | Cómo lo detectamos |
|---|---|
| Puso la opción `-g` de `swipl` después del archivo, así que la consulta nunca se ejecutó | No mostraba nada en pantalla |
| Supuso que `swipl-wasm` tardaba «segundos» y que había que encolar las llamadas | Midiéndolo: 140 ms, y la consulta es síncrona |
| Usó `library(http/json)`, que no existe en el build WebAssembly | Falló la primera prueba |
| Las pruebas agregaban hechos en el módulo equivocado (`plunit` en vez de `user`) | Fallaron 8 pruebas |
| Empezó a programar sin revisar los issues ni los PR del compañero | Al hacer `git fetch` aparecieron los PR de Gravyn |
| Un commit registra rutas que todavía no existen | Repasando el historial antes del PR |

**Mensaje principal:** la IA escribe rápido, pero las pruebas, el cálculo a mano y la revisión de PR fueron los que encontraron los errores.

## 8. Qué cambiaríamos
- Revisar los issues y los PR abiertos **antes** de pedirle algo a la IA.
- Correr también la colección de Postman en GitHub Actions, no solo las pruebas del motor.
- Publicar el backend antes, para probar con Neon real desde el principio.
- ✏️ Lo que el grupo agregue.

## 9. Reparto del trabajo
Evidencia: los issues asignados, los PR revisados por la otra persona y el historial de commits. ✏️ Actualizar los números el día antes:

```bash
git fetch && git shortlog -sn --no-merges origin/main
gh pr list --state merged --json number,author,title
```

Al 19-11-2026, contando las ramas abiertas: ArmandoR05 tenía 21 commits y 5 PR; Gravyn, 14 commits y 4 PR.

| Integrante | Partes |
|---|---|
| Gravyn | Motor Prolog, 37 pruebas plunit, CI, módulo `swipl-wasm`, contrato, verificación a mano, y las pantallas de emitir, detalle y reportes |
| Armando | Backend y endpoints, seguridad, migración en Neon, colección de Postman, y las pantallas de catálogo, nueva factura e historial |

## 10. Cierre y entregables
- ✏️ URL del repositorio: https://github.com/GravynJimLun/facturacion-prolog-grupo4
- ✏️ URL del sistema publicado (GitHub Pages y el backend)
- Colección de Postman: `api/postman/facturacion.postman_collection.json`
- `BITACORA_IA.md`
- ✏️ Diapositivas

## Preguntas probables (para preparar)
- ¿Por qué los rangos de `descuento_volumen` no se solapan? ¿Qué es un *choicepoint*?
- ¿Cómo se calcula el precio de un kit que contiene otro kit? (recursión: k2 = (k1 + p5) × 0,95)
- ¿Por qué una factura rechazada responde 200 y no 400?
- ¿Cómo evitan la inyección SQL? ¿Y la «inyección Prolog»?
- ¿Qué pasa si dos personas emiten la misma factura a la vez?
- ¿Por qué el precio del kit no se redondea antes de calcular la línea?
