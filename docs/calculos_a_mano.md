# Cálculos a mano de las facturas de ejemplo

Comprobación manual de lo que devuelve el motor (`reglas/facturacion.pl`) con los datos de `reglas/facturacion_datos.pl`.

**Orden de cálculo por línea:**

1. Bruto = precio × cantidad.
2. Se aplica el descuento por volumen.
3. Se aplica el descuento del cliente.
4. La base se redondea al colón.
5. IVA = base × tarifa, redondeado al colón.

El **subtotal** es la suma de las bases y el **total** es el subtotal más el IVA.

## Factura 1: tienda_sol (contribuyente, oro), contado → **emitida**

| Línea | Bruto | Desc. volumen | Desc. oro 10 % | Base | IVA 13 % |
|---|---:|---:|---:|---:|---:|
| p2 laptop × 2 | 900.000 | 0 % → 900.000 | 810.000 | 810.000 | 105.300 |
| p4 mouse × 12 | 102.000 | 5 % → 96.900 | 87.210 | 87.210 | 11.337,3 → 11.337 |
| p5 hora_soporte × 3 | 75.000 | 0 % → 75.000 | 67.500 | 67.500 | 8.775 |
| **Totales** | | | | **964.710** | **125.412** |

Total = **1.090.122**

## Factura 2: juan_perez (consumidor final, regular), contado → **emitida** (valor de control)

| Línea | Bruto | Desc. volumen | Base | Tarifa | IVA |
|---|---:|---:|---:|---:|---:|
| p1 arroz × 10 | 12.000 | 5 % | 11.400 | 1 % | 114 |
| p3 paracetamol × 2 | 3.000 | 0 % | 3.000 | 2 % | 60 |
| p6 libro × 1 | 12.000 | 0 % | 12.000 | 0 % | 0 |
| **Totales** | | | **26.400** | | **174** |

Total = **26.574** ✔ coincide con la guía.

## Factura 3: fundacion_esperanza (exonerado, plata), contado → **emitida** (valor de control)

| Línea | Bruto | Desc. volumen | Desc. plata 5 % | Base | IVA |
|---|---:|---:|---:|---:|---:|
| p2 laptop × 1 | 450.000 | 0 % → 450.000 | 427.500 | 427.500 | 0 (exonerado) |
| p7 teclado × 10 | 180.000 | 5 % → 171.000 | 162.450 | 162.450 | 0 (exonerado) |

Total = **589.950**, IVA 0 ✔ coincide con la guía.

## Factura 4: comercial_luna (contribuyente, regular), crédito → **rechazada**

Error: *No se permite crédito a comercial_luna porque su nivel es regular.*

Los montos se calculan igual, para mostrarlos: p4 × 5 = 42.500, IVA 13 % = 5.525, total 48.025.

## Factura 5: juan_perez, contado → **rechazada**

Error: *No hay suficiente stock de laptop: se piden 20 y solo hay 15.*

Montos: 20 × 450.000 = 9.000.000, con 5 % por volumen queda en 8.550.000. IVA 1.111.500 y total 9.661.500.

## Factura 6: tienda_sol (oro), crédito, kit k2 × 1 → **emitida**

Precio del kit, calculado de forma recursiva:

- k1 = (laptop 450.000 + mouse 8.500 + teclado 18.000) × 0,95 = 476.500 × 0,95 = **452.675**
- k2 = (k1 452.675 + hora_soporte 25.000) × 0,95 = 477.675 × 0,95 = **453.791,25**

| Línea | Bruto | Desc. volumen | Desc. oro 10 % | Base | IVA 13 % (kit = general) |
|---|---:|---:|---:|---:|---:|
| k2 × 1 | 453.791,25 | 0 % | 408.412,125 | 408.412 | 53.093,56 → 53.094 |

Total = **461.506**

El stock se valida con los componentes: 1 laptop, 1 mouse, 1 teclado y 1 hora de soporte. Hay stock suficiente de todos.

> **Decisión de diseño:** el precio del kit no se redondea por separado. Se redondea una sola vez, al calcular la base de la línea.

## Reportes (solo las facturas emitidas: 1, 2, 3 y 6)

| Concepto | Valor |
|---|---:|
| Subtotal vendido | 964.710 + 26.400 + 589.950 + 408.412 = **1.989.472** |
| IVA por pagar | 125.412 + 174 + 0 + 53.094 = **178.680** |
| Ventas totales (con IVA) | **2.168.152** |
| Producto más vendido | **p4 mouse**, con 12 unidades |
| Siguiente consecutivo | **7** |

Las unidades vendidas se cuentan por ítem, tal como aparece en la línea: el kit k2 cuenta como 1 unidad de k2.
