// Los datos de ejemplo de sql/facturacion_neon.sql, con el formato de
// entrada del motor (docs/CONTRATO.md §3.1). Sirven para las pruebas y
// para el motor falso.

export const productos = [
  { cod: "p1", nombre: "arroz_1kg", categoria: "canasta", precio: 1200, stock: 200 },
  { cod: "p2", nombre: "laptop", categoria: "general", precio: 450000, stock: 15 },
  { cod: "p3", nombre: "paracetamol", categoria: "medicamento", precio: 1500, stock: 500 },
  { cod: "p4", nombre: "mouse", categoria: "general", precio: 8500, stock: 80 },
  { cod: "p5", nombre: "hora_soporte", categoria: "general", precio: 25000, stock: 9999 },
  { cod: "p6", nombre: "libro_texto", categoria: "exento", precio: 12000, stock: 30 },
  { cod: "p7", nombre: "teclado", categoria: "general", precio: 18000, stock: 40 },
];

export const kits = [
  { cod: "k1", componentes: ["p2", "p4", "p7"] },
  { cod: "k2", componentes: ["k1", "p5"] },
];

export const clientes = [
  { id: "c1", nombre: "tienda_sol", tipo: "contribuyente", nivel: "oro" },
  { id: "c2", nombre: "juan_perez", tipo: "consumidor_final", nivel: "regular" },
  { id: "c3", nombre: "fundacion_esperanza", tipo: "exonerado", nivel: "plata" },
  { id: "c4", nombre: "comercial_luna", tipo: "contribuyente", nivel: "regular" },
];

export const facturas = [
  { id: 1, clienteId: "c1", formaPago: "contado", lineas: [["p2", 2], ["p4", 12], ["p5", 3]] },
  { id: 2, clienteId: "c2", formaPago: "contado", lineas: [["p1", 10], ["p3", 2], ["p6", 1]] },
  { id: 3, clienteId: "c3", formaPago: "contado", lineas: [["p2", 1], ["p7", 10]] },
  { id: 4, clienteId: "c4", formaPago: "credito", lineas: [["p4", 5]] },
  { id: 5, clienteId: "c2", formaPago: "contado", lineas: [["p2", 20]] },
  { id: 6, clienteId: "c1", formaPago: "credito", lineas: [["k2", 1]] },
];

/** Arma la entrada de calcularFactura() para una factura de ejemplo. */
export function entradaFactura(id) {
  const f = facturas.find((x) => x.id === id);
  if (!f) throw new Error(`No hay factura de ejemplo ${id}`);
  return {
    factura: { id: f.id, clienteId: f.clienteId, formaPago: f.formaPago },
    lineas: f.lineas.map(([productoCod, cantidad]) => ({ productoCod, cantidad })),
    cliente: clientes.find((c) => c.id === f.clienteId),
    productos,
    kits,
  };
}
