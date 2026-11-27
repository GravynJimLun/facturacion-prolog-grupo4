// Motor de reglas Prolog para el backend (docs/CONTRATO.md §3).
//
// Usa swipl-wasm: SWI-Prolog compilado a WebAssembly, así que no hay que
// instalar SWI-Prolog en el servidor. Los archivos de reglas/ se copian al
// sistema de archivos virtual de WebAssembly y se cargan una sola vez.
//
// Los datos viajan como texto JSON (puente_json.pl). Nunca se arman
// consultas Prolog pegando datos como texto.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import SWIPL from "swipl-wasm";

const CARPETA_REGLAS = fileURLToPath(new URL("../../../reglas/", import.meta.url));
const ARCHIVOS = ["facturacion_reglas.pl", "puente_json.pl"];

let motorListo = null; // Promise: se inicia en la primera llamada.

async function iniciarMotor() {
  const swipl = await SWIPL({ arguments: ["-q"] });
  swipl.FS.mkdir("/reglas");
  for (const archivo of ARCHIVOS) {
    const contenido = await readFile(CARPETA_REGLAS + archivo, "utf8");
    swipl.FS.writeFile(`/reglas/${archivo}`, contenido);
  }
  const carga = swipl.prolog.query("consult('/reglas/puente_json.pl')").once();
  if (!carga.success) {
    throw new Error(`No se pudo cargar el motor Prolog: ${carga.message ?? "error desconocido"}`);
  }
  return swipl;
}

function obtenerMotor() {
  motorListo ??= iniciarMotor().catch((error) => {
    motorListo = null; // permite reintentar en la siguiente llamada
    throw error;
  });
  return motorListo;
}

// Ejecuta un predicado puente(+EntradaJSON, -SalidaJSON).
// La consulta es síncrona (once), así que dos llamadas nunca se mezclan:
// JavaScript no puede ejecutar otra mientras esta no termine.
function consultar(swipl, predicado, datos) {
  const respuesta = swipl.prolog
    .query(`${predicado}(Entrada, Salida)`, { Entrada: JSON.stringify(datos) })
    .once();
  if (!respuesta.success) {
    const detalle = respuesta.message ?? "la consulta falló (¿faltan campos en la entrada?)";
    throw new Error(`Motor Prolog: ${detalle}`);
  }
  return JSON.parse(respuesta.Salida);
}

/**
 * Calcula una factura con las reglas del negocio.
 * @param {object} datos { factura, lineas, cliente, productos, kits } (contrato §3.1)
 * @returns {Promise<object>} { estado, subtotal, iva, total, lineas, consumoStock, errores }
 */
export async function calcularFactura(datos) {
  const swipl = await obtenerMotor();
  return consultar(swipl, "calcular_factura_json", datos);
}

/**
 * Precio de cada kit (contrato §3.4).
 * @param {object} datos { productos, kits }
 * @returns {Promise<Record<string, number>>} por ejemplo { k1: 452675, k2: 453791.25 }
 */
export async function preciosKits(datos) {
  const swipl = await obtenerMotor();
  return consultar(swipl, "precios_kits_json", datos);
}

/**
 * Valida un producto antes de crearlo o actualizarlo (contrato §3.7).
 * Las reglas están en reglas/facturacion_reglas.pl §10.
 * @param {object} datos { operacion: "crear"|"actualizar", producto, productos, kits }
 *   `productos` es el catálogo COMPLETO, con los desactivados (`activo: false`).
 * @returns {Promise<{ valido: boolean, errores: { codigo, campo, mensaje }[] }>}
 */
export async function validarProducto(datos) {
  const swipl = await obtenerMotor();
  return consultar(swipl, "validar_producto_json", datos);
}

/**
 * Revisa si un producto se puede eliminar (desactivar). Contrato §3.7.
 * @param {object} datos { cod, productos, kits }
 * @returns {Promise<{ valido: boolean, errores: { codigo, campo, mensaje }[] }>}
 */
export async function validarEliminarProducto(datos) {
  const swipl = await obtenerMotor();
  return consultar(swipl, "validar_eliminar_json", datos);
}
