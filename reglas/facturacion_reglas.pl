% =====================================================================
% Motor de reglas del sistema de facturación
% SC-250 Paradigmas de Programación · Universidad Fidélitas
%
% Este archivo solo tiene REGLAS, no datos.
%  - En consola, con los datos de ejemplo:  swipl reglas/consola.pl
%  - Pruebas:  swipl -g run_tests -t halt reglas/pruebas.pl
%  - En el backend, los datos vienen de Neon y se cargan con assertz
%    (ver docs/CONTRATO.md §3.6).
% =====================================================================

% Los hechos son dinámicos porque el backend los reemplaza en cada
% cálculo con los datos que lee de Neon.
:- dynamic producto/5, kit/2, cliente/4, factura/3, linea/3.

% ---------------------------------------------------------------------
% 1. Tarifas de IVA por categoría
% ---------------------------------------------------------------------
% tarifa_iva(Categoria, Porcentaje)
% Las tarifas se guardan como porcentajes enteros, no como 0.13, para
% evitar errores de redondeo de los números de punto flotante.
% Son valores didácticos: hay que compararlos con las tarifas vigentes
% de Hacienda y comentar en el informe si difieren.
tarifa_iva(general,     13).
tarifa_iva(medicamento,  2).
tarifa_iva(canasta,      1).
tarifa_iva(exento,       0).

% ---------------------------------------------------------------------
% 2. Productos y kits: precio y categoría
% ---------------------------------------------------------------------
% Un "item" es cualquier cosa que puede ir en una línea de factura:
% un producto o un kit.

% precio_item(Cod, Precio): precio unitario de un producto o de un kit.
%  - Producto: el precio que viene en los datos.
%  - Kit: la suma de los precios de sus componentes, menos 5 %.
%    Un componente puede ser otro kit, y por eso la regla es recursiva:
%    k2 = (precio(k1) + precio(p5)) * 0.95
%    k1 = (precio(p2) + precio(p4) + precio(p7)) * 0.95
%
% Decisión del grupo: el precio del kit NO se redondea aquí. Se
% redondea una sola vez, en la línea de la factura, como pide la regla
% de redondeo.
precio_item(Cod, Precio) :-
    producto(Cod, _, _, Precio, _).
precio_item(Cod, Precio) :-
    kit(Cod, Componentes),
    sumar_precios(Componentes, Suma),
    Precio is Suma * 95 / 100.

% sumar_precios(ListaDeItems, Total): suma recursiva de los precios.
sumar_precios([], 0).
sumar_precios([Item|Resto], Total) :-
    precio_item(Item, Precio),
    sumar_precios(Resto, TotalResto),
    Total is Precio + TotalResto.

% categoria_item(Cod, Categoria): los kits tributan como "general".
categoria_item(Cod, Categoria) :-
    producto(Cod, _, Categoria, _, _).
categoria_item(Cod, general) :-
    kit(Cod, _).

% existe_item(Cod): el código es un producto o un kit.
existe_item(Cod) :- producto(Cod, _, _, _, _).
existe_item(Cod) :- kit(Cod, _).

% nombre_item(Cod, Nombre): nombre para los mensajes de error.
% Los kits no tienen nombre en los datos; se usa su código.
nombre_item(Cod, Nombre) :-
    (   producto(Cod, Nombre0, _, _, _) -> Nombre = Nombre0
    ;   Nombre = Cod
    ).

% ---------------------------------------------------------------------
% 3. Descuentos
% ---------------------------------------------------------------------
% descuento_volumen(Cantidad, Porcentaje): descuento por línea.
% Los rangos NO se solapan, así que para cada cantidad hay una sola
% respuesta. Si la segunda regla fuera solo "C >= 10", una cantidad de
% 60 daría dos respuestas (10 y 5): es la "trampa conocida" de la guía.
% Se usan rangos en vez de cortes (!) para que la regla también sea
% correcta cuando se consulta con el porcentaje ya dado, por ejemplo
% descuento_volumen(60, 5), que debe fallar.
descuento_volumen(C, 10) :- C >= 50.
descuento_volumen(C, 5)  :- C >= 10, C < 50.
descuento_volumen(C, 0)  :- C < 10.

% descuento_cliente(Nivel, Porcentaje)
% Se aplica DESPUÉS del descuento por volumen, sobre el precio ya
% descontado (los descuentos se encadenan, no se suman).
descuento_cliente(oro,     10).
descuento_cliente(plata,    5).
descuento_cliente(regular,  0).

% ---------------------------------------------------------------------
% 4. Cálculo por línea
% ---------------------------------------------------------------------
% tarifa_linea(ClienteId, Item, Tarifa): un cliente exonerado paga IVA 0
% en todas sus líneas; los demás pagan la tarifa de la categoría.
tarifa_linea(ClienteId, Item, Tarifa) :-
    cliente(ClienteId, _, Tipo, _),
    (   Tipo == exonerado
    ->  Tarifa = 0
    ;   categoria_item(Item, Categoria),
        tarifa_iva(Categoria, Tarifa)
    ).

% calcular_linea(Factura, Item, Cantidad, Detalle)
% Detalle = detalle(Item, Cantidad, Categoria, PrecioUnitario,
%                   DescVolumen, DescCliente, Base, Tarifa, Iva)
%   Base = Precio × Cantidad × (1 − DescVolumen) × (1 − DescCliente),
%          redondeada al colón.
%   Iva  = Base × Tarifa, redondeado al colón (sobre la base ya
%          redondeada).
calcular_linea(Factura, Item, Cantidad,
               detalle(Item, Cantidad, Categoria, Precio,
                       DescVol, DescCli, Base, Tarifa, Iva)) :-
    factura(Factura, ClienteId, _),
    cliente(ClienteId, _, _, Nivel),
    precio_item(Item, Precio),
    categoria_item(Item, Categoria),
    descuento_volumen(Cantidad, DescVol),
    descuento_cliente(Nivel, DescCli),
    Base is round(Precio * Cantidad * (100 - DescVol) * (100 - DescCli) / 10000),
    tarifa_linea(ClienteId, Item, Tarifa),
    Iva is round(Base * Tarifa / 100).

% lineas_calculadas(Factura, Detalles): todas las líneas, en orden.
lineas_calculadas(Factura, Detalles) :-
    findall(D,
            ( linea(Factura, Item, Cantidad),
              calcular_linea(Factura, Item, Cantidad, D) ),
            Detalles).

% ---------------------------------------------------------------------
% 5. Totales de la factura
% ---------------------------------------------------------------------
% El total es la suma de las líneas ya redondeadas (no se redondea de
% nuevo).
totales_factura(Factura, Subtotal, Iva, Total) :-
    factura(Factura, _, _),
    lineas_calculadas(Factura, Detalles),
    findall(B, member(detalle(_, _, _, _, _, _, B, _, _), Detalles), Bases),
    findall(I, member(detalle(_, _, _, _, _, _, _, _, I), Detalles), Ivas),
    sum_list(Bases, Subtotal),
    sum_list(Ivas, Iva),
    Total is Subtotal + Iva.

% ---------------------------------------------------------------------
% 6. Consumo de stock (los kits se expanden a sus componentes)
% ---------------------------------------------------------------------
% consumo_item(Item, Cantidad, Producto, Unidades): enumera, por
% backtracking, cuántas unidades de cada producto consume una línea.
% Es recursiva porque un kit puede contener otros kits.
consumo_item(Item, Cantidad, Item, Cantidad) :-
    producto(Item, _, _, _, _).
consumo_item(Item, Cantidad, Producto, Unidades) :-
    kit(Item, Componentes),
    member(Componente, Componentes),
    consumo_item(Componente, Cantidad, Producto, Unidades).

% consumo_factura(Factura, Consumo): lista Producto-Unidades, una sola
% entrada por producto (suma todas las líneas y todos los kits).
% Solo cuenta las líneas con cantidad positiva.
consumo_factura(Factura, Consumo) :-
    findall(P-U,
            ( linea(Factura, Item, Cantidad),
              Cantidad > 0,
              consumo_item(Item, Cantidad, P, U) ),
            Pares),
    findall(P, member(P-_, Pares), Productos0),
    sort(Productos0, Productos),
    findall(P-Total,
            ( member(P, Productos),
              aggregate_all(sum(U), member(P-U, Pares), Total) ),
            Consumo).

% ---------------------------------------------------------------------
% 7. Validaciones (con explicación)
% ---------------------------------------------------------------------
% error_factura(Factura, error(Codigo, Producto, Mensaje))
%   Producto es el código del item o del producto, o 'ninguno' si el
%   error no es de una línea. Los códigos están en docs/CONTRATO.md §3.3.

% Factura sin líneas.
error_factura(F, error(factura_sin_lineas, ninguno, Mensaje)) :-
    factura(F, _, _),
    \+ linea(F, _, _),
    Mensaje = 'La factura no tiene líneas.'.

% Producto o kit que no existe en el catálogo.
error_factura(F, error(producto_inexistente, Item, Mensaje)) :-
    linea(F, Item, _),
    \+ existe_item(Item),
    format(atom(Mensaje), 'El producto ~w no existe en el catálogo.', [Item]).

% Cantidad menor o igual a cero.
error_factura(F, error(cantidad_invalida, Item, Mensaje)) :-
    linea(F, Item, Cantidad),
    Cantidad =< 0,
    nombre_item(Item, Nombre),
    format(atom(Mensaje), 'La cantidad de ~w debe ser mayor que cero.', [Nombre]).

% Stock insuficiente. Se revisa por producto, sumando todas las líneas
% de la factura y los componentes de los kits.
error_factura(F, error(stock_insuficiente, Producto, Mensaje)) :-
    factura(F, _, _),
    consumo_factura(F, Consumo),
    member(Producto-Pedidas, Consumo),
    producto(Producto, Nombre, _, _, Stock),
    Pedidas > Stock,
    format(atom(Mensaje),
           'No hay suficiente stock de ~w: se pidieron ~w y solo hay ~w.',
           [Nombre, Pedidas, Stock]).

% Crédito no permitido a consumidor final ni a clientes de nivel regular.
% Si se cumplen las dos condiciones, se da un solo error.
error_factura(F, error(credito_no_permitido, ninguno, Mensaje)) :-
    factura(F, ClienteId, credito),
    cliente(ClienteId, Nombre, Tipo, Nivel),
    (   Tipo == consumidor_final
    ->  format(atom(Mensaje),
               '~w es consumidor final y no puede comprar a crédito.', [Nombre])
    ;   Nivel == regular
    ->  format(atom(Mensaje),
               '~w es un cliente de nivel regular y no puede comprar a crédito.', [Nombre])
    ).

% errores_factura(Factura, Errores): lista completa (vacía si no hay).
errores_factura(F, Errores) :-
    findall(E, error_factura(F, E), Errores).

% ---------------------------------------------------------------------
% 8. Estado y resultado de la factura
% ---------------------------------------------------------------------
% estado_factura(Factura, Estado): una sola respuesta por factura.
estado_factura(F, Estado) :-
    factura(F, _, _),
    errores_factura(F, Errores),
    (   Errores == []
    ->  Estado = emitida
    ;   Estado = rechazada
    ).

% resultado_factura(Factura, Resultado): todo lo que el backend necesita
% (docs/CONTRATO.md §3.1). Una factura rechazada no tiene totales.
%   Resultado = resultado(Estado, Subtotal, Iva, Total,
%                         Lineas, ConsumoStock, Errores)
resultado_factura(F, resultado(Estado, Sub, Iva, Tot, Lineas, Consumo, Errores)) :-
    estado_factura(F, Estado),
    errores_factura(F, Errores),
    (   Estado == emitida
    ->  totales_factura(F, Sub, Iva, Tot),
        lineas_calculadas(F, Lineas),
        consumo_factura(F, Consumo)
    ;   Sub = null, Iva = null, Tot = null,
        Lineas = [], Consumo = []
    ).

% ---------------------------------------------------------------------
% 9. Reportes (solo cuentan las facturas emitidas)
% ---------------------------------------------------------------------
% Nota: con los datos de ejemplo, cada factura se valida contra el stock
% inicial. En el backend, el stock se descuenta en Neon al emitir.

factura_emitida(F) :-
    factura(F, _, _),
    estado_factura(F, emitida).

% Ventas totales: suma de los totales (con IVA) de las facturas emitidas.
ventas_totales(Total) :-
    aggregate_all(sum(T),
                  ( factura_emitida(F), totales_factura(F, _, _, T) ),
                  Total).

% IVA por pagar: suma del IVA de las facturas emitidas.
iva_por_pagar(Iva) :-
    aggregate_all(sum(I),
                  ( factura_emitida(F), totales_factura(F, _, I, _) ),
                  Iva).

% unidades_vendidas(Item, Unidades): por código de línea (un kit cuenta
% como kit). Una sola respuesta por item.
unidades_vendidas(Item, Unidades) :-
    findall(I, ( factura_emitida(F), linea(F, I, _) ), Items0),
    sort(Items0, Items),
    member(Item, Items),
    aggregate_all(sum(C), ( factura_emitida(F), linea(F, Item, C) ), Unidades).

% producto_mas_vendido(Item, Unidades): el de más unidades. Si hay
% empate, gana el código menor en orden alfabético, para que siempre
% haya una sola respuesta.
producto_mas_vendido(Item, Unidades) :-
    findall(U-I, unidades_vendidas(I, U), Pares),
    Pares \== [],
    max_member(Unidades-_, Pares),
    findall(I, member(Unidades-I, Pares), Empatados),
    min_member(Item, Empatados).

% siguiente_consecutivo(N): el id de factura más alto + 1 (1 si no hay).
siguiente_consecutivo(N) :-
    (   aggregate_all(max(Id), factura(Id, _, _), Max)
    ->  N is Max + 1
    ;   N = 1
    ).
