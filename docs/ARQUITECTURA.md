# Arquitectura del sistema

GitHub dibuja este diagrama automáticamente. Para las diapositivas se puede exportar como imagen en <https://mermaid.live>.

```mermaid
flowchart LR
    U([Usuario<br/>navegador o celular])

    subgraph FRONT["Front end · React + Vite · GitHub Pages"]
        P["Pantallas<br/>catálogo · nueva factura · historial<br/>emitir · detalle · reportes"]
        A["api.js<br/>todas las llamadas"]
        P --> A
    end

    subgraph BACK["Backend · Node.js + Express"]
        R["Rutas /api/...<br/>validación de datos · CORS"]
        DB["db.js<br/>pg · consultas con parámetros"]
        M["motor/index.js<br/>swipl-wasm"]
        R --> DB
        R -->|"emitir y precios de kits"| M
    end

    subgraph PROLOG["Motor de reglas · Prolog"]
        PJ["puente_json.pl<br/>JSON ↔ hechos"]
        FR["facturacion_reglas.pl<br/>IVA · kits · descuentos<br/>validaciones · reportes"]
        PJ --> FR
    end

    NEON[("Neon · PostgreSQL<br/>productos · kits · clientes<br/>facturas · líneas")]

    U --> P
    A -->|"HTTP + JSON"| R
    DB -->|"SQL"| NEON
    M -->|"texto JSON"| PJ
```

## Qué pasa al emitir una factura

```mermaid
sequenceDiagram
    actor U as Usuario
    participant W as Front end
    participant API as Backend
    participant N as Neon
    participant P as Motor Prolog

    U->>W: Clic en «Emitir»
    W->>API: POST /api/facturas/7/emitir
    API->>N: BEGIN · bloquea la factura y el stock (FOR UPDATE)
    alt la factura no existe
        API-->>W: 404
    else ya estaba emitida
        API-->>W: 409
    end
    N-->>API: factura, líneas, cliente y catálogo
    API->>P: calcularFactura(datos) como JSON
    P->>P: assertz de los hechos → resultado_factura/2
    P-->>API: estado, totales, detalle por línea, consumo de stock y errores
    API->>N: guarda el resultado, el detalle por línea y descuenta el stock · COMMIT
    API-->>W: 200 con el resultado (emitida o rechazada)
    W-->>U: Totales, o errores explicados en lenguaje claro
```

## Decisiones principales

| Decisión | Por qué |
|---|---|
| **Opción A de la guía:** `swipl-wasm` dentro del backend | No hay que instalar SWI-Prolog en el servidor. Medido: unos 140 ms de arranque y 1 ms por factura (Entrada 3 de la bitácora) |
| Las reglas solo viven en Prolog | El backend y el front end no repiten descuentos, IVA ni validaciones. El precio de los kits también lo da el motor |
| Los datos entran a Prolog como JSON | Nunca se pegan como texto en una consulta: es el equivalente Prolog de la inyección SQL |
| Emitir en una sola transacción | O se guarda todo (estado, totales, líneas y stock) o no se guarda nada. Dos emisiones simultáneas no venden el mismo stock |
| El detalle por línea se guarda al emitir | Una factura vieja no se recalcula: el stock y los precios pudieron cambiar |
| Una factura rechazada responde 200 | La petición se procesó bien; quien dice que no es la regla del negocio |
| HashRouter (`#/`) en el front end | GitHub Pages solo sirve archivos estáticos |
