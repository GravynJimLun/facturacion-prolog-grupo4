% =====================================================================
% Puente JSON entre el backend (Node) y el motor de reglas.
%
% El backend manda los datos de Neon como TEXTO JSON y recibe el
% resultado también como texto JSON (docs/CONTRATO.md §3). Los datos
% nunca se pegan dentro de una consulta Prolog: se leen con el parser
% JSON y se guardan con assertz. Es el equivalente Prolog de usar
% consultas con parámetros en SQL.
% =====================================================================

:- ensure_loaded(facturacion_reglas).

% La librería JSON se llama library(json) en SWI-Prolog 10 o superior y
% library(http/json) en versiones anteriores (por ejemplo, la 9 que usa
% GitHub Actions).
:- if(exists_source(library(json))).
:- use_module(library(json)).
:- else.
:- use_module(library(http/json)).
:- endif.

% ---------------------------------------------------------------------
% Entradas
% ---------------------------------------------------------------------

% calcular_factura_json(+EntradaJSON, -SalidaJSON)
% Entrada y salida con el formato de docs/CONTRATO.md §3.1.
calcular_factura_json(Entrada, Salida) :-
    leer_json(Entrada, D),
    cargar_catalogo(D),
    cargar_factura(D, Id),
    resultado_factura(Id, Resultado),
    resultado_a_dict(Resultado, Dict),
    atom_json_dict(Salida, Dict, [width(0)]).

% precios_kits_json(+EntradaJSON, -SalidaJSON)
% Entrada: { productos, kits }. Salida: { "k1": 452675, ... }.
precios_kits_json(Entrada, Salida) :-
    leer_json(Entrada, D),
    cargar_catalogo(D),
    findall(Cod-Precio, (kit(Cod, _), precio_item(Cod, Precio)), Pares),
    dict_create(Dict, _, Pares),
    atom_json_dict(Salida, Dict, [width(0)]).

% validar_producto_json(+EntradaJSON, -SalidaJSON)
% Entrada: { operacion: "crear" | "actualizar",
%            producto: { cod, nombre, categoria, precio, stock },
%            productos, kits }      (catálogo actual, con los desactivados)
% Salida:  { valido: true | false, errores: [ { codigo, campo, mensaje } ] }
% Formato completo en docs/CONTRATO.md §3.7.
validar_producto_json(Entrada, Salida) :-
    leer_json(Entrada, D),
    cargar_catalogo(D),
    _{operacion: Op, producto: P} :< D,
    memberchk(Op, [crear, actualizar]),
    _{cod: Cod, nombre: Nombre, categoria: Cat, precio: Precio, stock: Stock} :< P,
    errores_producto(Op, producto(Cod, Nombre, Cat, Precio, Stock), Errores),
    validacion_a_json(Errores, Salida).

% validar_eliminar_json(+EntradaJSON, -SalidaJSON)
% Entrada: { cod, productos, kits }. Salida: igual que validar_producto_json.
validar_eliminar_json(Entrada, Salida) :-
    leer_json(Entrada, D),
    cargar_catalogo(D),
    get_dict(cod, D, Cod),
    errores_eliminar(Cod, Errores),
    validacion_a_json(Errores, Salida).

% Los textos JSON se leen como átomos (p1, contado, oro…), que es lo
% que esperan las reglas.
leer_json(Texto, Dict) :-
    atom_json_dict(Texto, Dict, [value_string_as(atom)]).

% ---------------------------------------------------------------------
% Carga de hechos (reemplaza los anteriores en cada llamada)
% ---------------------------------------------------------------------

limpiar_hechos :-
    retractall(producto(_, _, _, _, _)),
    retractall(producto_inactivo(_)),
    retractall(kit(_, _)),
    retractall(cliente(_, _, _, _)),
    retractall(factura(_, _, _)),
    retractall(linea(_, _, _)).

% `Patron :< Dict` toma del diccionario los campos que nombra el patrón
% y falla si falta alguno.
cargar_catalogo(D) :-
    limpiar_hechos,
    get_dict(productos, D, Productos),
    forall(member(P, Productos),
           ( _{cod: Cod, nombre: Nombre, categoria: Cat, precio: Precio, stock: Stock} :< P,
             assertz(producto(Cod, Nombre, Cat, Precio, Stock)),
             % "activo" es opcional: solo lo manda el mantenimiento de productos.
             (   get_dict(activo, P, false)
             ->  assertz(producto_inactivo(Cod))
             ;   true
             ) )),
    get_dict(kits, D, Kits),
    forall(member(K, Kits),
           ( _{cod: Cod, componentes: Componentes} :< K,
             assertz(kit(Cod, Componentes)) )).

cargar_factura(D, Id) :-
    _{factura: F, cliente: C, lineas: Lineas} :< D,
    _{id: Id, clienteId: ClienteId, formaPago: FormaPago} :< F,
    _{id: ClienteId, nombre: Nombre, tipo: Tipo, nivel: Nivel} :< C,
    assertz(cliente(ClienteId, Nombre, Tipo, Nivel)),
    assertz(factura(Id, ClienteId, FormaPago)),
    forall(member(L, Lineas),
           ( _{productoCod: Item, cantidad: Cantidad} :< L,
             assertz(linea(Id, Item, Cantidad)) )).

% ---------------------------------------------------------------------
% Salida: términos del motor → diccionarios JSON
% ---------------------------------------------------------------------

resultado_a_dict(resultado(Estado, Sub, Iva, Tot, Lineas, Consumo, Errores),
                 _{estado: Estado, subtotal: Sub, iva: Iva, total: Tot,
                   lineas: LineasD, consumoStock: ConsumoD, errores: ErroresD}) :-
    maplist(detalle_a_dict, Lineas, LineasD),
    maplist(consumo_a_dict, Consumo, ConsumoD),
    maplist(error_a_dict, Errores, ErroresD).

detalle_a_dict(detalle(Item, Cant, Cat, Precio, DV, DC, Base, Tarifa, Iva),
               _{productoCod: Item, cantidad: Cant, categoria: Cat,
                 precioUnitario: Precio, descVolumen: DV, descCliente: DC,
                 base: Base, tarifaIva: Tarifa, iva: Iva}).

consumo_a_dict(Producto-Unidades, _{productoCod: Producto, cantidad: Unidades}).

% Los errores que no son de una línea no llevan productoCod.
error_a_dict(error(Codigo, ninguno, Mensaje), _{codigo: Codigo, mensaje: Mensaje}) :- !.
error_a_dict(error(Codigo, Producto, Mensaje),
             _{codigo: Codigo, productoCod: Producto, mensaje: Mensaje}).

% Errores de validación de productos. Todos llevan el campo del
% formulario que hay que corregir.
validacion_a_json(Errores, Salida) :-
    (   Errores == [] -> Valido = true ; Valido = false ),
    maplist(error_campo_a_dict, Errores, ErroresD),
    atom_json_dict(Salida, _{valido: Valido, errores: ErroresD}, [width(0)]).

error_campo_a_dict(error(Codigo, Campo, Mensaje),
                   _{codigo: Codigo, campo: Campo, mensaje: Mensaje}).
