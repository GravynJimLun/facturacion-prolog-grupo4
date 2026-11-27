% Carga el motor con los datos de ejemplo, para probarlo en consola:
%   swipl reglas/consola.pl
%
% Consultas útiles:
%   ?- totales_factura(2, Sub, Iva, Total).
%   ?- errores_factura(5, Errores).
%   ?- estado_factura(F, Estado).
%   ?- lineas_calculadas(1, Lineas).
%   ?- ventas_totales(V), iva_por_pagar(I), producto_mas_vendido(P, U).
%   ?- errores_producto(crear, producto(p1, '', ropa, 0, 5), Errores).
%   ?- errores_eliminar(p2, Errores).
%   ?- kit_contiene(Kit, p7).
:- ensure_loaded(facturacion_reglas).
:- ensure_loaded(facturacion_datos).
