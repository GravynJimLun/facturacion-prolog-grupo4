% =====================================================================
% Motor de reglas del sistema de facturación
% SC-250 Paradigmas de Programación · Universidad Fidélitas
%
% Uso:  swipl reglas/facturacion_reglas.pl
% Los datos de ejemplo se cargan desde facturacion_datos.pl.
% =====================================================================

:- ensure_loaded(facturacion_datos).

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
