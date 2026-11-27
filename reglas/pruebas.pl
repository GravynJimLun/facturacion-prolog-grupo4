% Pruebas automáticas del motor con plunit.
%   swipl -g run_tests -t halt reglas/pruebas.pl
%
% Los valores esperados de las facturas 1, 4, 5 y 6 se calcularon a mano
% (docs/VERIFICACION.md). Los de las facturas 2 y 3 son los valores de
% control de la guía.
:- use_module(library(plunit)).
:- ensure_loaded(facturacion_reglas).
:- ensure_loaded(facturacion_datos).

% Factura de prueba temporal: se crea antes de la prueba y se borra
% después, para no tocar los datos de ejemplo.
crear_factura_temporal(Cliente, FormaPago, Lineas) :-
    assertz(factura(99, Cliente, FormaPago)),
    forall(member(Item-Cant, Lineas), assertz(linea(99, Item, Cant))).

borrar_factura_temporal :-
    retractall(factura(99, _, _)),
    retractall(linea(99, _, _)).

% Sobre [nondet]: algunas reglas, como descuento_volumen o precio_item,
% tienen varias cláusulas. Cuando la primera responde, Prolog deja
% abierta la posibilidad de probar las demás (un "choicepoint"), aunque
% esas fallen. No es una segunda respuesta. Que haya UNA sola respuesta
% se comprueba aparte con findall (test volumen_una_sola_respuesta y
% un_solo_estado_por_factura). [nondet] le dice a plunit que el
% choicepoint es esperado.

codigos_error(F, Codigos) :-
    errores_factura(F, Errores),
    findall(C, member(error(C, _, _), Errores), Codigos).

% ---------------------------------------------------------------------
:- begin_tests(tarifas_y_kits).

test(tarifas_iva) :-
    tarifa_iva(general, 13), tarifa_iva(medicamento, 2),
    tarifa_iva(canasta, 1), tarifa_iva(exento, 0).

test(precio_kit_simple, [nondet]) :-
    precio_item(k1, P), P =:= 452675.

test(precio_kit_recursivo, [nondet]) :-
    precio_item(k2, P), P =:= 453791.25.

test(kit_tributa_como_general) :-
    categoria_item(k2, C), C == general.

test(consumo_de_kit_expande_componentes) :-
    findall(P-U, consumo_item(k2, 3, P, U), Consumo0),
    msort(Consumo0, Consumo),
    Consumo == [p2-3, p4-3, p5-3, p7-3].

:- end_tests(tarifas_y_kits).

% ---------------------------------------------------------------------
:- begin_tests(descuentos).

test(volumen_menos_de_10) :- descuento_volumen(9, D), D == 0.
test(volumen_10_exacto, [nondet]) :- descuento_volumen(10, D), D == 5.
test(volumen_49, [nondet])        :- descuento_volumen(49, D), D == 5.
test(volumen_50_exacto, [nondet]) :- descuento_volumen(50, D), D == 10.

% La "trampa conocida": una sola respuesta, no dos.
test(volumen_una_sola_respuesta) :-
    findall(D, descuento_volumen(60, D), Ds), Ds == [10].

test(volumen_falla_con_porcentaje_incorrecto, [fail]) :-
    descuento_volumen(60, 5).

test(cliente_por_nivel) :-
    descuento_cliente(oro, 10), descuento_cliente(plata, 5),
    descuento_cliente(regular, 0).

% Los descuentos se encadenan: 180.000 → −5 % = 171.000 → −5 % = 162.450.
test(descuentos_encadenados, [nondet]) :-
    calcular_linea(3, p7, 10, detalle(_, _, _, _, 5, 5, Base, _, _)),
    Base == 162450.

:- end_tests(descuentos).

% ---------------------------------------------------------------------
:- begin_tests(totales).

test(factura_2_valores_de_control) :-
    totales_factura(2, S, I, T), [S, I, T] == [26400, 174, 26574].

test(factura_3_exonerado_valores_de_control) :-
    totales_factura(3, S, I, T), [S, I, T] == [589950, 0, 589950].

test(factura_1_calculada_a_mano) :-
    totales_factura(1, S, I, T), [S, I, T] == [964710, 125412, 1090122].

test(factura_6_kit_recursivo) :-
    totales_factura(6, S, I, T), [S, I, T] == [408412, 53094, 461506].

test(exonerado_todas_las_lineas_con_iva_0) :-
    lineas_calculadas(3, Lineas),
    forall(member(detalle(_, _, _, _, _, _, _, Tarifa, Iva), Lineas),
           (Tarifa == 0, Iva == 0)).

test(iva_redondeado_por_linea, [nondet]) :-
    % mouse: 102.000 → 96.900 → 87.210; IVA 13 % = 11.337,3 → 11.337
    calcular_linea(1, p4, 12, detalle(_, _, _, _, _, _, 87210, 13, Iva)),
    Iva == 11337.

:- end_tests(totales).

% ---------------------------------------------------------------------
:- begin_tests(validaciones).

test(factura_4_credito_a_cliente_regular) :-
    codigos_error(4, C), C == [credito_no_permitido].

test(factura_5_stock_insuficiente) :-
    errores_factura(5, [error(stock_insuficiente, p2, _)]).

test(credito_a_consumidor_final,
     [setup(crear_factura_temporal(c2, credito, [p1-1])),
      cleanup(borrar_factura_temporal)]) :-
    codigos_error(99, C), C == [credito_no_permitido].

test(factura_sin_lineas,
     [setup(crear_factura_temporal(c1, contado, [])),
      cleanup(borrar_factura_temporal)]) :-
    codigos_error(99, C), C == [factura_sin_lineas].

test(cantidad_cero_o_negativa,
     [setup(crear_factura_temporal(c1, contado, [p1-0, p3-(-2)])),
      cleanup(borrar_factura_temporal)]) :-
    codigos_error(99, C), C == [cantidad_invalida, cantidad_invalida].

test(producto_inexistente,
     [setup(crear_factura_temporal(c1, contado, [p99-1])),
      cleanup(borrar_factura_temporal)]) :-
    codigos_error(99, C), C == [producto_inexistente].

% 16 kits k1 necesitan 16 laptops y solo hay 15.
test(stock_insuficiente_dentro_de_un_kit,
     [setup(crear_factura_temporal(c1, contado, [k1-16])),
      cleanup(borrar_factura_temporal)]) :-
    errores_factura(99, [error(stock_insuficiente, p2, _)]).

% 10 laptops sueltas + 6 dentro de kits = 16 > 15.
test(stock_suma_lineas_y_kits,
     [setup(crear_factura_temporal(c1, contado, [p2-10, k1-6])),
      cleanup(borrar_factura_temporal)]) :-
    errores_factura(99, [error(stock_insuficiente, p2, _)]).

test(varios_errores_a_la_vez,
     [setup(crear_factura_temporal(c4, credito, [p2-20, p1-0])),
      cleanup(borrar_factura_temporal)]) :-
    codigos_error(99, C0), msort(C0, C),
    C == [cantidad_invalida, credito_no_permitido, stock_insuficiente].

:- end_tests(validaciones).

% ---------------------------------------------------------------------
:- begin_tests(estado).

test(estados_de_los_datos_de_ejemplo) :-
    findall(F-E, estado_factura(F, E), Estados),
    Estados == [1-emitida, 2-emitida, 3-emitida,
                4-rechazada, 5-rechazada, 6-emitida].

% Cada factura tiene una sola respuesta (sin duplicados).
test(un_solo_estado_por_factura) :-
    forall(factura(F, _, _),
           ( findall(E, estado_factura(F, E), Es), length(Es, 1) )).

test(rechazada_sin_totales) :-
    resultado_factura(5, resultado(rechazada, null, null, null, [], [], [_])).

test(emitida_con_consumo_de_stock) :-
    resultado_factura(6, resultado(emitida, _, _, _, _, Consumo, [])),
    Consumo == [p2-1, p4-1, p5-1, p7-1].

:- end_tests(estado).

% ---------------------------------------------------------------------
:- begin_tests(reportes).

% Solo facturas emitidas: 1, 2, 3 y 6.
test(ventas_totales) :- ventas_totales(V), V == 2168152.
test(iva_por_pagar)  :- iva_por_pagar(I), I == 178680.

test(unidades_vendidas) :-
    findall(I-U, unidades_vendidas(I, U), Us),
    Us == [k2-1, p1-10, p2-3, p3-2, p4-12, p5-3, p6-1, p7-10].

test(producto_mas_vendido) :-
    findall(P-U, producto_mas_vendido(P, U), R), R == [p4-12].

test(siguiente_consecutivo) :- siguiente_consecutivo(N), N == 7.

:- end_tests(reportes).

% ---------------------------------------------------------------------
% Mantenimiento de productos (sección 10). Usa el catálogo de ejemplo:
% p1..p7, k1 = [p2, p4, p7] y k2 = [k1, p5].
codigos_producto(Op, Producto, Codigos) :-
    errores_producto(Op, Producto, Errores),
    findall(C, member(error(C, _, _), Errores), Codigos).

% Como crear_factura_temporal: se definen aquí (módulo user) para que el
% assertz llegue a los hechos del motor y no al módulo de la prueba.
desactivar_temporal(Cod) :- assertz(producto_inactivo(Cod)).
reactivar_todos :- retractall(producto_inactivo(_)).

:- begin_tests(productos).

test(producto_valido) :-
    errores_producto(crear, producto(p8, cafe_molido, canasta, 3500, 40), E),
    E == [].

test(codigo_duplicado_al_crear) :-
    codigos_producto(crear, producto(p1, arroz_2kg, canasta, 2300, 10), C),
    C == [codigo_duplicado].

test(codigo_de_kit_tambien_es_duplicado) :-
    codigos_producto(crear, producto(k1, otro, general, 100, 1), C),
    C == [codigo_duplicado].

test(actualizar_no_choca_consigo_mismo) :-
    errores_producto(actualizar, producto(p4, mouse, general, 9000, 75), E),
    E == [].

test(nombre_duplicado_sin_importar_mayusculas) :-
    errores_producto(crear, producto(p8, '  Mouse ', general, 9000, 5), E),
    E = [error(nombre_duplicado, nombre, M)],
    M == 'Ya existe un producto llamado mouse (código p4).'.

test(nombre_de_producto_desactivado_se_puede_usar,
     [ setup(desactivar_temporal(p4)), cleanup(reactivar_todos) ]) :-
    errores_producto(crear, producto(p8, mouse, general, 9000, 5), E),
    E == [].

test(codigo_de_producto_desactivado_sigue_ocupado,
     [ setup(desactivar_temporal(p4)), cleanup(reactivar_todos) ]) :-
    codigos_producto(crear, producto(p4, mouse_nuevo, general, 9000, 5), C),
    C == [codigo_duplicado].

test(categoria_invalida_usa_las_tarifas) :-
    errores_producto(crear, producto(p8, camisa, ropa, 9000, 5), E),
    E = [error(categoria_invalida, categoria, M)],
    M == 'La categoría ropa no existe. Use una de estas: general, medicamento, canasta, exento.'.

test(precio_con_decimales_es_invalido) :-
    codigos_producto(crear, producto(p8, cafe, canasta, 10.5, 5), C),
    C == [precio_invalido].

test(todos_los_errores_a_la_vez) :-
    errores_producto(crear, producto(p1, '   ', ropa, 0, -1), E),
    findall(Cod-Campo, member(error(Cod, Campo, _), E), Pares),
    Pares == [codigo_duplicado-cod, nombre_vacio-nombre, categoria_invalida-categoria,
              precio_invalido-precio, stock_invalido-stock].

test(eliminar_producto_libre) :-
    errores_eliminar(p1, E), E == [].

test(eliminar_producto_de_kit_recursivo) :-
    % p2 está en k1, y k1 está en k2: los dos kits lo bloquean.
    errores_eliminar(p2, E),
    E = [error(producto_en_kit, cod, M)],
    M == 'No se puede eliminar laptop porque forma parte de estos kits: k1, k2.'.

test(eliminar_producto_solo_en_k2) :-
    errores_eliminar(p5, [error(producto_en_kit, cod, M)]),
    M == 'No se puede eliminar hora_soporte porque forma parte de estos kits: k2.'.

test(kit_contiene_es_recursiva) :-
    findall(K, kit_contiene(K, p7), Ks0), sort(Ks0, Ks),
    Ks == [k1, k2].

:- end_tests(productos).
