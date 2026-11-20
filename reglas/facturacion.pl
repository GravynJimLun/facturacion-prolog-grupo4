% =====================================================================
% MOTOR DE REGLAS · Sistema de facturación (SC-250, grupo 4)
%
% Uso:   swipl reglas/facturacion.pl
%        ?- resultado_factura(2, R).
%        ?- errores_explicados(5, L).
%        ?- reporte_ventas(Sub, Iva, Total).
%
% Convenciones:
%   - Los porcentajes se manejan como ENTEROS (13 = 13 %) para que las
%     cuentas sean fáciles de leer y verificar a mano.
%   - Cada línea redondea su base y su IVA al colón; el total de la
%     factura es la suma de las líneas ya redondeadas.
%   - "Subtotal" = suma de las bases (después de descuentos, sin IVA).
% =====================================================================

% Los hechos son dinámicos para que el backend (y las pruebas) puedan
% agregar o quitar facturas, líneas, etc. con assertz/retract.
:- dynamic producto/5, kit/2, cliente/4, factura/3, linea/3.

:- ensure_loaded(facturacion_datos).

% ---------------------------------------------------------------------
% 1. Tarifas de IVA por categoría (porcentaje)
%    Valores didácticos de la guía; verificar con Hacienda en el informe.
% ---------------------------------------------------------------------
tarifa_iva(general,     13).
tarifa_iva(medicamento,  2).
tarifa_iva(canasta,      1).
tarifa_iva(exento,       0).

% ---------------------------------------------------------------------
% 2. Ítems: un código puede ser un producto o un kit
% ---------------------------------------------------------------------
es_producto(Cod) :- producto(Cod, _, _, _, _).
es_kit(Cod)      :- kit(Cod, _).

item_existe(Cod) :- ( es_producto(Cod) -> true ; es_kit(Cod) ).

% precio_item(+Cod, -Precio)
% Producto: su precio de lista.
% Kit: suma de los precios de sus componentes menos 5 %. Es recursivo
% porque un componente puede ser a su vez otro kit. El precio del kit
% NO se redondea aquí: se redondea una sola vez, al calcular la línea.
precio_item(Cod, Precio) :-
    (   producto(Cod, _, _, Precio, _)
    ->  true
    ;   kit(Cod, Componentes),
        precios_componentes(Componentes, Suma),
        Precio is Suma * 95 / 100
    ).

precios_componentes([], 0).
precios_componentes([C|Cs], Suma) :-
    precio_item(C, P),
    precios_componentes(Cs, Resto),
    Suma is P + Resto.

% categoria_item(+Cod, -Categoria): los kits tributan como "general".
categoria_item(Cod, Cat) :-
    (   producto(Cod, _, Cat, _, _)
    ->  true
    ;   es_kit(Cod),
        Cat = general
    ).

% ---------------------------------------------------------------------
% 3. Descuentos (porcentaje)
% ---------------------------------------------------------------------
% Por volumen, por línea: 50 o más -> 10 %; 10 o más -> 5 %; si no, 0 %.
% Se usa if-then-else para que haya UNA sola respuesta (determinista).
descuento_volumen(Cant, D) :-
    (   Cant >= 50 -> D = 10
    ;   Cant >= 10 -> D = 5
    ;   D = 0
    ).

% Por nivel del cliente; se aplica DESPUÉS del descuento por volumen.
descuento_cliente(oro,     10).
descuento_cliente(plata,    5).
descuento_cliente(regular,  0).

% ---------------------------------------------------------------------
% 4. Cálculo de una línea
% ---------------------------------------------------------------------
% calculo_linea(+Factura, +Item, +Cant, -Detalle)
% Detalle = detalle(Item, Cant, PrecioUnit, Bruto, DescVol, DescCli,
%                   Base, TasaIva, Iva)
calculo_linea(F, Item, Cant,
              detalle(Item, Cant, PrecioUnit, Bruto, DV, DC, Base, Tasa, Iva)) :-
    factura(F, ClienteId, _),
    cliente(ClienteId, _, Tipo, Nivel),
    precio_item(Item, PrecioUnit),
    categoria_item(Item, Cat),
    descuento_volumen(Cant, DV),
    descuento_cliente(Nivel, DC),
    Bruto is PrecioUnit * Cant,
    Base  is round(Bruto * (100 - DV) * (100 - DC) / 10000),
    tasa_para(Tipo, Cat, Tasa),
    Iva   is round(Base * Tasa / 100).

% Cliente exonerado: todas sus líneas van con IVA 0.
tasa_para(Tipo, Cat, Tasa) :-
    (   Tipo == exonerado
    ->  Tasa = 0
    ;   tarifa_iva(Cat, Tasa)
    ).

% lineas_calculadas(+Factura, -Detalles): en el mismo orden de las líneas.
% Las líneas con un producto inexistente no se pueden calcular y quedan
% fuera; esas facturas salen rechazadas por la validación correspondiente.
lineas_calculadas(F, Detalles) :-
    findall(D, ( linea(F, Item, Cant), calculo_linea(F, Item, Cant, D) ), Detalles).

% totales_factura(+Factura, -Subtotal, -Iva, -Total)
totales_factura(F, Subtotal, Iva, Total) :-
    factura(F, _, _),
    lineas_calculadas(F, Detalles),
    sumar_detalles(Detalles, Subtotal, Iva),
    Total is Subtotal + Iva.

sumar_detalles([], 0, 0).
sumar_detalles([detalle(_, _, _, _, _, _, B, _, I)|Ds], Sub, Iva) :-
    sumar_detalles(Ds, Sub0, Iva0),
    Sub is Sub0 + B,
    Iva is Iva0 + I.

% ---------------------------------------------------------------------
% 5. Validaciones: error_factura(+Factura, -Error)
%    Cada cláusula describe UN tipo de error. Una factura puede tener
%    varios errores; errores/2 los junta sin repetidos.
% ---------------------------------------------------------------------
error_factura(F, factura_sin_lineas) :-
    factura(F, _, _),
    \+ linea(F, _, _).

error_factura(F, cliente_inexistente(C)) :-
    factura(F, C, _),
    \+ cliente(C, _, _, _).

error_factura(F, producto_inexistente(Item)) :-
    linea(F, Item, _),
    \+ item_existe(Item).

error_factura(F, cantidad_invalida(Item, Cant)) :-
    linea(F, Item, Cant),
    Cant =< 0.

% Stock: se suman TODAS las unidades que la factura pide de cada producto,
% incluidas las que vienen dentro de kits (los kits no tienen stock propio,
% se descuentan sus componentes).
error_factura(F, stock_insuficiente(Prod, Pedido, Disponible)) :-
    productos_pedidos(F, Productos),
    member(Prod, Productos),
    unidades_pedidas(F, Prod, Pedido),
    producto(Prod, _, _, _, Disponible),
    Pedido > Disponible.

% Crédito no permitido a consumidor final ni a clientes de nivel regular.
% Se reporta un solo error aunque se cumplan las dos condiciones.
error_factura(F, credito_no_permitido(C, Motivo)) :-
    factura(F, C, credito),
    cliente(C, _, Tipo, Nivel),
    (   Tipo == consumidor_final -> Motivo = consumidor_final
    ;   Nivel == regular         -> Motivo = nivel_regular
    ).

% unidades_de(+Item, -Producto, -Unidades): cuántas unidades de Producto
% contiene UNA unidad de Item (recorre kits dentro de kits).
unidades_de(Item, Item, 1) :-
    es_producto(Item).
unidades_de(Item, Prod, U) :-
    kit(Item, Componentes),
    member(C, Componentes),
    unidades_de(C, Prod, U).

productos_pedidos(F, Productos) :-
    (   setof(P, Item^Cant^U^( linea(F, Item, Cant), Cant > 0,
                               unidades_de(Item, P, U) ), Productos)
    ->  true
    ;   Productos = []
    ).

unidades_pedidas(F, Prod, Total) :-
    aggregate_all(sum(Q),
                  ( linea(F, Item, Cant), Cant > 0,
                    unidades_de(Item, Prod, U),
                    Q is Cant * U ),
                  Total).

% ---------------------------------------------------------------------
% 6. Estado y resultado de la factura
% ---------------------------------------------------------------------
errores(F, Errores) :-
    factura(F, _, _),
    findall(E, error_factura(F, E), Todos),
    list_to_set(Todos, Errores).

estado(F, Estado) :-
    errores(F, Errores),
    (   Errores == [] -> Estado = emitida ; Estado = rechazada ).

% resultado_factura(+F, -resultado(Estado, Subtotal, Iva, Total, Errores))
% Es lo que el backend guarda en Neon al emitir.
resultado_factura(F, resultado(Estado, Subtotal, Iva, Total, Textos)) :-
    estado(F, Estado),
    totales_factura(F, Subtotal, Iva, Total),
    errores_explicados(F, Textos).

% ---------------------------------------------------------------------
% 7. Explicación de los errores en lenguaje claro
% ---------------------------------------------------------------------
errores_explicados(F, Textos) :-
    errores(F, Errores),
    maplist(explicacion, Errores, Textos).

explicacion(factura_sin_lineas, 'La factura no tiene líneas: agregue al menos un producto.').
explicacion(cliente_inexistente(C), T) :-
    format(atom(T), 'El cliente ~w no existe.', [C]).
explicacion(producto_inexistente(P), T) :-
    format(atom(T), 'El producto o kit ~w no existe en el catálogo.', [P]).
explicacion(cantidad_invalida(P, Cant), T) :-
    nombre_item(P, N),
    format(atom(T), 'La cantidad de ~w debe ser mayor que cero (se indicó ~w).', [N, Cant]).
explicacion(stock_insuficiente(P, Pedido, Disp), T) :-
    nombre_item(P, N),
    format(atom(T), 'No hay suficiente stock de ~w: se piden ~w y solo hay ~w.', [N, Pedido, Disp]).
explicacion(credito_no_permitido(C, consumidor_final), T) :-
    nombre_cliente(C, N),
    format(atom(T), 'No se permite crédito a ~w porque es consumidor final.', [N]).
explicacion(credito_no_permitido(C, nivel_regular), T) :-
    nombre_cliente(C, N),
    format(atom(T), 'No se permite crédito a ~w porque su nivel es regular.', [N]).

nombre_item(Cod, Nombre) :-
    (   producto(Cod, Nombre, _, _, _) -> true ; Nombre = Cod ).
nombre_cliente(Id, Nombre) :-
    (   cliente(Id, Nombre, _, _) -> true ; Nombre = Id ).

% ---------------------------------------------------------------------
% 8. Reportes (solo cuentan las facturas EMITIDAS)
% ---------------------------------------------------------------------
emitida(F) :- factura(F, _, _), estado(F, emitida).

% reporte_ventas(-Subtotal, -IvaPorPagar, -Total)
reporte_ventas(Subtotal, Iva, Total) :-
    aggregate_all(sum(S), ( emitida(F), totales_factura(F, S, _, _) ), Subtotal),
    aggregate_all(sum(I), ( emitida(F), totales_factura(F, _, I, _) ), Iva),
    Total is Subtotal + Iva.

ventas_totales(Total) :- reporte_ventas(_, _, Total).
iva_por_pagar(Iva)    :- reporte_ventas(_, Iva, _).

% unidades_vendidas(?Item, -Unidades): por ítem tal como aparece en la
% línea (un kit vendido cuenta como 1 unidad del kit).
% Con Item conocido responde una sola vez (0 si no se ha vendido);
% con Item libre enumera solo los ítems que sí se vendieron.
unidades_vendidas(Item, Unidades) :-
    (   nonvar(Item)
    ->  true
    ;   setof(I, F^C^( emitida(F), linea(F, I, C) ), Items),
        member(Item, Items)
    ),
    aggregate_all(sum(C), ( emitida(F), linea(F, Item, C) ), Unidades).

% producto_mas_vendido(-Item, -Unidades): si hay empate, da cada uno.
producto_mas_vendido(Item, Unidades) :-
    aggregate_all(max(U), unidades_vendidas(_, U), Unidades),
    unidades_vendidas(Item, Unidades).

% siguiente_consecutivo(-N): número de la próxima factura.
siguiente_consecutivo(N) :-
    (   aggregate_all(max(F), factura(F, _, _), Max)
    ->  N is Max + 1
    ;   N = 1
    ).
