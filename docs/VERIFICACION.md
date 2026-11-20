# Verificación a mano de las facturas

La guía exige comprobar a mano al menos 3 facturas. Aquí está el cálculo paso a paso de las 6 facturas de ejemplo (`reglas/facturacion_datos.pl`), comparado con lo que da el motor.

**Cómo se calcula cada línea** (todo en colones):

1. Bruto = precio unitario × cantidad.
2. Se aplica el descuento por volumen: 10 o más unidades, 5 %; 50 o más, 10 %.
3. Sobre ese resultado se aplica el descuento por cliente: oro 10 %, plata 5 %, regular 0 %.
4. Base = el resultado anterior, redondeado al colón.
5. IVA = base × tarifa de la categoría, redondeado al colón. Para un cliente exonerado, el IVA es 0.
6. Subtotal = suma de las bases. IVA de la factura = suma de los IVA. Total = subtotal + IVA.

> **Pendiente del grupo:** rehacer cada número con calculadora y marcar la casilla. Lo calculado aquí coincide con el motor y con las pruebas de `reglas/pruebas.pl`, pero la guía pide que lo verifiquemos nosotros.

---

## Factura 1: tienda_sol (contribuyente, oro), contado → **emitida**

| Producto | Cant. | Precio | Bruto | Vol. | Cliente | Base | Tarifa | IVA |
|---|---|---|---|---|---|---|---|---|
| p2 laptop | 2 | 450.000 | 900.000 | 0 % → 900.000 | 10 % → 810.000 | **810.000** | 13 % | **105.300** |
| p4 mouse | 12 | 8.500 | 102.000 | 5 % → 96.900 | 10 % → 87.210 | **87.210** | 13 % | 11.337,3 → **11.337** |
| p5 hora_soporte | 3 | 25.000 | 75.000 | 0 % → 75.000 | 10 % → 67.500 | **67.500** | 13 % | **8.775** |

**Subtotal 964.710 · IVA 125.412 · Total 1.090.122** ☐ verificado

## Factura 2: juan_perez (consumidor final, regular), contado → **emitida** (valor de control)

| Producto | Cant. | Precio | Bruto | Vol. | Cliente | Base | Tarifa | IVA |
|---|---|---|---|---|---|---|---|---|
| p1 arroz_1kg | 10 | 1.200 | 12.000 | 5 % → 11.400 | 0 % | **11.400** | 1 % | **114** |
| p3 paracetamol | 2 | 1.500 | 3.000 | 0 % | 0 % | **3.000** | 2 % | **60** |
| p6 libro_texto | 1 | 12.000 | 12.000 | 0 % | 0 % | **12.000** | 0 % | **0** |

**Subtotal 26.400 · IVA 174 · Total 26.574.** Coincide con el valor de control de la guía. ☐ verificado

## Factura 3: fundacion_esperanza (exonerado, plata), contado → **emitida** (valor de control)

| Producto | Cant. | Precio | Bruto | Vol. | Cliente | Base | Tarifa | IVA |
|---|---|---|---|---|---|---|---|---|
| p2 laptop | 1 | 450.000 | 450.000 | 0 % | 5 % → 427.500 | **427.500** | exonerado | **0** |
| p7 teclado | 10 | 18.000 | 180.000 | 5 % → 171.000 | 5 % → 162.450 | **162.450** | exonerado | **0** |

**Subtotal 589.950 · IVA 0 · Total 589.950.** Coincide con el valor de control. Los dos descuentos del teclado se encadenan: el 5 % de cliente se aplica sobre 171.000, no sobre 180.000. ☐ verificado

## Factura 4: comercial_luna (contribuyente, regular), crédito → **rechazada**

- Error `credito_no_permitido`: «comercial_luna es un cliente de nivel regular y no puede comprar a crédito.»
- El stock alcanza (pide 5 mouse y hay 80), así que este es el único error. ☐ verificado

## Factura 5: juan_perez (consumidor final, regular), contado → **rechazada**

- Error `stock_insuficiente`: «No hay suficiente stock de laptop: se pidieron 20 y solo hay 15.»
- Es de contado, así que la regla de crédito no aplica. ☐ verificado

## Factura 6: tienda_sol (contribuyente, oro), crédito → **emitida**

Un cliente oro que es contribuyente **sí** puede comprar a crédito.

**Precio del kit k2** (recursivo):
- k1 = (450.000 + 8.500 + 18.000) × 0,95 = 476.500 × 0,95 = **452.675**
- k2 = (k1 + p5) × 0,95 = (452.675 + 25.000) × 0,95 = 477.675 × 0,95 = **453.791,25**. No se redondea aquí; se redondea en la línea.

| Item | Cant. | Precio | Bruto | Vol. | Cliente | Base | Tarifa | IVA |
|---|---|---|---|---|---|---|---|---|
| k2 (kit) | 1 | 453.791,25 | 453.791,25 | 0 % | 10 % → 408.412,125 | **408.412** | 13 % (general) | 53.093,56 → **53.094** |

**Subtotal 408.412 · IVA 53.094 · Total 461.506**

**Stock:** k2 consume 1 unidad de p2, p4, p7 (a través de k1) y de p5. Todos tienen stock suficiente. ☐ verificado

---

## Reportes (solo facturas emitidas: 1, 2, 3 y 6)

| Reporte | Cálculo | Resultado |
|---|---|---|
| Ventas totales | 1.090.122 + 26.574 + 589.950 + 461.506 | **2.168.152** |
| IVA por pagar | 125.412 + 174 + 0 + 53.094 | **178.680** |
| Unidades por producto | p1 10 · p2 3 (2 + 1) · p3 2 · p4 12 · p5 3 · p6 1 · p7 10 · k2 1 | |
| Producto más vendido | El de más unidades | **p4 mouse (12)** |
| Siguiente consecutivo | Factura más alta (6) + 1 | **7** |

---

## Decisiones del grupo que afectan los números

| Decisión | Por qué |
|---|---|
| El precio del kit no se redondea; se redondea la base de la línea | La guía dice que se redondea cada línea; redondear antes cambiaría el resultado |
| El IVA se calcula sobre la base ya redondeada | Así la factura cuadra línea por línea |
| El stock de un kit se revisa en sus componentes, de forma recursiva, sumando todas las líneas de la factura | Un kit no tiene stock propio en los datos |
| Si un cliente es consumidor final **y** regular, se da un solo error de crédito | Evita mensajes repetidos |
| Una factura rechazada no tiene totales | Sus números no son válidos y no deben aparecer en reportes |
| «Ventas totales» incluye el IVA | Es lo que pagó el cliente; el IVA por pagar se reporta aparte |
| Las unidades vendidas se cuentan por código de línea (un kit cuenta como kit) | Es lo que se vendió; el consumo de componentes es un tema de inventario |
| En los datos de ejemplo, cada factura se valida contra el stock inicial | Prolog no descuenta stock entre facturas; en el sistema real, el backend lo descuenta en Neon al emitir |

## Tarifas de IVA frente a Hacienda

☐ **Pendiente:** comparar las tarifas didácticas (13 %, 2 %, 1 %, 0 %) con las vigentes de Hacienda y anotar aquí si alguna difiere, como pide la guía.
