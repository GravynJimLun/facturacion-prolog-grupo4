// Pruebas del módulo del motor: npm test (desde api/).
// Comprueban que el JSON de salida cumple el contrato y que los números
// coinciden con los de reglas/pruebas.pl y docs/VERIFICACION.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularFactura, preciosKits } from "./index.js";
import { entradaFactura, productos, kits } from "./datos-ejemplo.js";

const totales = (r) => [r.subtotal, r.iva, r.total];

test("factura 2: valores de control de la guía", async () => {
  const r = await calcularFactura(entradaFactura(2));
  assert.equal(r.estado, "emitida");
  assert.deepEqual(totales(r), [26400, 174, 26574]);
  assert.deepEqual(r.errores, []);
});

test("factura 2: detalle de la línea con el formato del contrato", async () => {
  const r = await calcularFactura(entradaFactura(2));
  assert.deepEqual(r.lineas[0], {
    productoCod: "p1", cantidad: 10, categoria: "canasta", precioUnitario: 1200,
    descVolumen: 5, descCliente: 0, base: 11400, tarifaIva: 1, iva: 114,
  });
  assert.deepEqual(r.consumoStock, [
    { productoCod: "p1", cantidad: 10 },
    { productoCod: "p3", cantidad: 2 },
    { productoCod: "p6", cantidad: 1 },
  ]);
});

test("factura 3: cliente exonerado, valores de control", async () => {
  const r = await calcularFactura(entradaFactura(3));
  assert.deepEqual(totales(r), [589950, 0, 589950]);
});

test("factura 1 y factura 6 (kit recursivo)", async () => {
  assert.deepEqual(totales(await calcularFactura(entradaFactura(1))), [964710, 125412, 1090122]);
  const r6 = await calcularFactura(entradaFactura(6));
  assert.deepEqual(totales(r6), [408412, 53094, 461506]);
  assert.equal(r6.lineas[0].precioUnitario, 453791.25);
});

test("factura 4: rechazada por crédito, sin productoCod", async () => {
  const r = await calcularFactura(entradaFactura(4));
  assert.equal(r.estado, "rechazada");
  assert.deepEqual(totales(r), [null, null, null]);
  assert.deepEqual(r.errores, [{
    codigo: "credito_no_permitido",
    mensaje: "comercial_luna es un cliente de nivel regular y no puede comprar a crédito.",
  }]);
});

test("factura 5: rechazada por stock, con mensaje en español", async () => {
  const r = await calcularFactura(entradaFactura(5));
  assert.deepEqual(r.errores, [{
    codigo: "stock_insuficiente",
    productoCod: "p2",
    mensaje: "No hay suficiente stock de laptop: se pidieron 20 y solo hay 15.",
  }]);
  assert.deepEqual(r.lineas, []);
  assert.deepEqual(r.consumoStock, []);
});

test("cada llamada reemplaza los datos de la anterior", async () => {
  // Primero una factura con un producto inexistente, luego la 2: la segunda
  // no debe arrastrar nada de la primera.
  const mala = entradaFactura(2);
  mala.lineas = [{ productoCod: "p99", cantidad: 1 }];
  const r1 = await calcularFactura(mala);
  assert.deepEqual(r1.errores.map((e) => e.codigo), ["producto_inexistente"]);
  const r2 = await calcularFactura(entradaFactura(2));
  assert.equal(r2.estado, "emitida");
});

test("texto con comillas y caracteres especiales no rompe la consulta", async () => {
  const entrada = entradaFactura(2);
  entrada.cliente = { ...entrada.cliente, nombre: "O'Brien \"Peña\"), halt. %" };
  entrada.factura.formaPago = "credito";
  const r = await calcularFactura(entrada);
  assert.equal(r.errores[0].codigo, "credito_no_permitido");
  assert.match(r.errores[0].mensaje, /^O'Brien "Peña"\), halt\. % es consumidor final/);
});

test("entrada incompleta: lanza un error claro", async () => {
  await assert.rejects(calcularFactura({ productos, kits }), /Motor Prolog/);
});

test("preciosKits", async () => {
  assert.deepEqual(await preciosKits({ productos, kits }), { k1: 452675, k2: 453791.25 });
});
