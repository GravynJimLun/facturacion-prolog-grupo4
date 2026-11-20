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
