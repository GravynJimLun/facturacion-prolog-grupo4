% =====================================================================
% Pruebas automáticas del motor de reglas (plunit)
%
% Correr:  swipl -g run_tests -t halt reglas/pruebas_facturacion.pl
%
% Los valores esperados de las facturas 1, 4, 5 y 6 están calculados a
% mano en docs/calculos_a_mano.md. Las facturas 2 y 3 son los valores de
% control de la guía.
% =====================================================================

:- ensure_loaded(facturacion).
:- use_module(library(plunit)).

% ---------------------------------------------------------------------
:- begin_tests(precios_y_descuentos).

test(tarifas_iva) :-
    findall(C-T, tarifa_iva(C, T), L),
    assertion(L == [general-13, medicamento-2, canasta-1, exento-0]).

test(precio_producto) :-
    precio_item(p2, P), assertion(P =:= 450000).

test(precio_kit_simple) :-                 % (450000+8500+18000) * 0.95
    precio_item(k1, P), assertion(P =:= 452675).

test(precio_kit_recursivo) :-              % (452675+25000) * 0.95
    precio_item(k2, P), assertion(P =:= 453791.25).

test(kit_tributa_como_general) :-
    categoria_item(k2, C), assertion(C == general).

test(descuento_volumen_limites, all(C-D == [9-0, 10-5, 49-5, 50-10, 100-10])) :-
    member(C, [9, 10, 49, 50, 100]),
    descuento_volumen(C, D).

:- end_tests(precios_y_descuentos).

% ---------------------------------------------------------------------
:- begin_tests(facturas_de_ejemplo).

test(control_factura_2) :-
    totales_factura(2, S, I, T),
    assertion(S-I-T == 26400-174-26574).

test(control_factura_3_exonerado) :-
    totales_factura(3, _, I, T),
    assertion(I-T == 0-589950).

test(factura_1) :-
    totales_factura(1, S, I, T),
    assertion(S-I-T == 964710-125412-1090122).

test(factura_6_kit_anidado) :-
    totales_factura(6, S, I, T),
    assertion(S-I-T == 408412-53094-461506).

test(estados, all(F-E == [1-emitida, 2-emitida, 3-emitida,
                          4-rechazada, 5-rechazada, 6-emitida])) :-
    between(1, 6, F),
    estado(F, E).

test(factura_4_credito_regular) :-
    errores(4, E),
    assertion(E == [credito_no_permitido(c4, nivel_regular)]).

test(factura_5_sin_stock) :-
    errores(5, E),
    assertion(E == [stock_insuficiente(p2, 20, 15)]).

test(estado_determinista) :-               % una sola respuesta, sin puntos de elección
    findall(E, estado(1, E), L),
    assertion(L == [emitida]).

:- end_tests(facturas_de_ejemplo).

% ---------------------------------------------------------------------
% Facturas de prueba que se agregan y se quitan en cada caso (ids 900+)
% ---------------------------------------------------------------------
limpiar :-
    forall(( user:factura(F, _, _), F >= 900 ), user:retractall(factura(F, _, _))),
    forall(( user:linea(F, _, _),   F >= 900 ), user:retractall(linea(F, _, _))).

:- begin_tests(validaciones).

test(sin_lineas, [setup(user:assertz(factura(900, c1, contado))), cleanup(limpiar)]) :-
    errores(900, E),
    assertion(E == [factura_sin_lineas]),
    estado(900, rechazada).

test(cantidad_cero_y_negativa,
     [setup(( user:assertz(factura(901, c1, contado)),
              user:assertz(linea(901, p1, 0)),
              user:assertz(linea(901, p3, -2)) )),
      cleanup(limpiar)]) :-
    errores(901, E),
    assertion(E == [cantidad_invalida(p1, 0), cantidad_invalida(p3, -2)]).

test(producto_inexistente,
     [setup(( user:assertz(factura(902, c1, contado)), user:assertz(linea(902, p99, 1)) )),
      cleanup(limpiar)]) :-
    errores(902, E),
    assertion(E == [producto_inexistente(p99)]).

test(credito_consumidor_final_un_solo_error,
     [setup(( user:assertz(factura(903, c2, credito)), user:assertz(linea(903, p1, 1)) )),
      cleanup(limpiar)]) :-
    errores(903, E),                       % c2 es consumidor final Y regular
    assertion(E == [credito_no_permitido(c2, consumidor_final)]).

test(credito_plata_permitido,
     [setup(( user:assertz(factura(904, c3, credito)), user:assertz(linea(904, p1, 1)) )),
      cleanup(limpiar)]) :-
    estado(904, emitida).

test(stock_suma_lineas_y_kits,             % 10 laptops sueltas + 6 dentro de kits = 16 > 15
     [setup(( user:assertz(factura(905, c1, contado)),
              user:assertz(linea(905, p2, 10)),
              user:assertz(linea(905, k2, 6)) )),
      cleanup(limpiar)]) :-
    errores(905, E),
    assertion(E == [stock_insuficiente(p2, 16, 15)]).

test(varios_errores_explicados,
     [setup(( user:assertz(factura(906, c4, credito)),
              user:assertz(linea(906, p6, 31)),
              user:assertz(linea(906, p4, 0)) )),
      cleanup(limpiar)]) :-
    errores_explicados(906, Textos),
    length(Textos, 3),
    assertion(member('No hay suficiente stock de libro_texto: se piden 31 y solo hay 30.', Textos)).

test(descuento_volumen_50,                 % 50 * 1200 = 60000 -10 % = 54000; plata -5 % = 51300; IVA 0 (exonerado)
     [setup(( user:assertz(factura(907, c3, contado)), user:assertz(linea(907, p1, 50)) )),
      cleanup(limpiar)]) :-
    totales_factura(907, S, I, T),
    assertion(S-I-T == 51300-0-51300).

:- end_tests(validaciones).

% ---------------------------------------------------------------------
:- begin_tests(reportes).

test(ventas_e_iva_solo_emitidas) :-        % facturas 1, 2, 3 y 6
    reporte_ventas(S, I, T),
    assertion(S-I-T == 1989472-178680-2168152).

test(unidades_vendidas_p2) :-              % 2 (fact. 1) + 1 (fact. 3); la 5 está rechazada
    unidades_vendidas(p2, U), assertion(U == 3).

test(producto_mas_vendido, all(P-U == [p4-12])) :-
    producto_mas_vendido(P, U).

test(siguiente_consecutivo) :-
    siguiente_consecutivo(N), assertion(N == 7).

:- end_tests(reportes).
