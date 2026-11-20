// Nueva factura (issue #20): elegir cliente y forma de pago, agregar y
// quitar líneas, ver el subtotal estimado y validar antes de enviar.
//
// El front end NO calcula descuentos ni IVA: eso es trabajo del motor
// Prolog al emitir. Aquí solo se estima precio × cantidad.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useDatos } from '../usarDatos.js';
import { Cargando, MensajeError } from '../componentes/Estados.jsx';
import { etiqueta, formatoColones, nombreLegible } from '../formato.js';

let siguienteClave = 1;
const lineaVacia = () => ({ clave: siguienteClave++, productoCod: '', cantidad: '1' });

// Devuelve { campo: mensaje } con los problemas del formulario.
function validar({ clienteId, lineas }) {
  const errores = {};
  if (!clienteId) errores.cliente = 'Elija un cliente.';
  if (lineas.length === 0) errores.lineas = 'Agregue al menos una línea.';
  for (const l of lineas) {
    if (!l.productoCod) errores[`producto-${l.clave}`] = 'Elija un producto.';
    const n = Number(l.cantidad);
    if (!Number.isInteger(n) || n < 1) errores[`cantidad-${l.clave}`] = 'Escriba un número entero mayor que 0.';
  }
  return errores;
}

export default function NuevaFactura() {
  const navegar = useNavigate();
  const { datos, cargando, error, recargar } = useDatos(
    () => Promise.all([api.clientes(), api.productos()]).then(([clientes, productos]) => ({ clientes, productos })),
    [],
  );

  const [clienteId, setClienteId] = useState('');
  const [formaPago, setFormaPago] = useState('contado');
  const [lineas, setLineas] = useState(() => [lineaVacia()]);
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState(null);

  const productoPorCodigo = useMemo(
    () => Object.fromEntries((datos?.productos ?? []).map((p) => [p.cod, p])),
    [datos],
  );

  const subtotalEstimado = lineas.reduce((suma, l) => {
    const p = productoPorCodigo[l.productoCod];
    const n = Number(l.cantidad);
    return p && Number.isInteger(n) && n > 0 ? suma + p.precio * n : suma;
  }, 0);

  const errores = validar({ clienteId, lineas });
  // Los errores se muestran después del primer intento de enviar, no mientras se escribe.
  const mostrar = (campo) => (intentoEnviar ? errores[campo] : undefined);

  const cambiarLinea = (clave, cambios) =>
    setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)));
  const quitarLinea = (clave) => setLineas((ls) => ls.filter((l) => l.clave !== clave));

  async function enviar(e) {
    e.preventDefault();
    setIntentoEnviar(true);
    setErrorEnvio(null);
    if (Object.keys(errores).length > 0) return;

    setEnviando(true);
    try {
      const factura = await api.crearFactura({
        clienteId,
        formaPago,
        lineas: lineas.map((l) => ({ productoCod: l.productoCod, cantidad: Number(l.cantidad) })),
      });
      navegar(`/facturas/${factura.id}/emitir`);
    } catch (err) {
      setErrorEnvio(err);
      setEnviando(false);
    }
  }

  if (cargando) return <Cargando texto="Cargando clientes y productos…" />;
  if (error) return <MensajeError error={error} alReintentar={recargar} />;

  return (
    <section>
      <h1>Nueva factura</h1>

      <form onSubmit={enviar} noValidate className="formulario">
        <fieldset>
          <legend>Cliente y pago</legend>
          <div className="fila-campos">
            <div className="campo">
              <label htmlFor="cliente">Cliente</label>
              <select
                id="cliente"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                aria-invalid={!!mostrar('cliente')}
                aria-describedby={mostrar('cliente') ? 'error-cliente' : undefined}
              >
                <option value="">— Elija un cliente —</option>
                {datos.clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {nombreLegible(c.nombre)} · {etiqueta(c.tipo)} · {etiqueta(c.nivel)}
                  </option>
                ))}
              </select>
              {mostrar('cliente') && (
                <p id="error-cliente" className="error-campo">
                  {mostrar('cliente')}
                </p>
              )}
            </div>

            <div className="campo" role="radiogroup" aria-labelledby="titulo-pago">
              <span id="titulo-pago" className="etiqueta">
                Forma de pago
              </span>
              <div className="opciones">
                {['contado', 'credito'].map((fp) => (
                  <label key={fp} className="opcion">
                    <input
                      type="radio"
                      name="formaPago"
                      value={fp}
                      checked={formaPago === fp}
                      onChange={() => setFormaPago(fp)}
                    />
                    {etiqueta(fp)}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Líneas</legend>
          {mostrar('lineas') && <p className="error-campo">{mostrar('lineas')}</p>}

          <ol className="lineas">
            {lineas.map((l, i) => {
              const p = productoPorCodigo[l.productoCod];
              const n = Number(l.cantidad);
              const errorProducto = mostrar(`producto-${l.clave}`);
              const errorCantidad = mostrar(`cantidad-${l.clave}`);
              return (
                <li key={l.clave} className="linea">
                  <div className="campo campo-ancho">
                    <label htmlFor={`producto-${l.clave}`}>Producto de la línea {i + 1}</label>
                    <select
                      id={`producto-${l.clave}`}
                      value={l.productoCod}
                      onChange={(e) => cambiarLinea(l.clave, { productoCod: e.target.value })}
                      aria-invalid={!!errorProducto}
                      aria-describedby={errorProducto ? `error-producto-${l.clave}` : undefined}
                    >
                      <option value="">— Elija un producto —</option>
                      {datos.productos.map((op) => (
                        <option key={op.cod} value={op.cod}>
                          {nombreLegible(op.nombre)}
                          {op.tipo === 'kit' ? ' (kit)' : ''} · {formatoColones(op.precio)}
                        </option>
                      ))}
                    </select>
                    {errorProducto && (
                      <p id={`error-producto-${l.clave}`} className="error-campo">
                        {errorProducto}
                      </p>
                    )}
                  </div>

                  <div className="campo campo-cantidad">
                    <label htmlFor={`cantidad-${l.clave}`}>Cantidad</label>
                    <input
                      id={`cantidad-${l.clave}`}
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      value={l.cantidad}
                      onChange={(e) => cambiarLinea(l.clave, { cantidad: e.target.value })}
                      aria-invalid={!!errorCantidad}
                      aria-describedby={errorCantidad ? `error-cantidad-${l.clave}` : undefined}
                    />
                    {errorCantidad && (
                      <p id={`error-cantidad-${l.clave}`} className="error-campo">
                        {errorCantidad}
                      </p>
                    )}
                    {p?.tipo === 'producto' && n > p.stock && (
                      <p className="aviso-campo">Solo hay {p.stock} en stock.</p>
                    )}
                  </div>

                  <p className="importe-linea" aria-label={`Importe de la línea ${i + 1}`}>
                    {p && Number.isInteger(n) && n > 0 ? formatoColones(p.precio * n) : '—'}
                  </p>

                  <button
                    type="button"
                    className="boton boton-peligro"
                    onClick={() => quitarLinea(l.clave)}
                    aria-label={`Quitar la línea ${i + 1}`}
                  >
                    Quitar
                  </button>
                </li>
              );
            })}
          </ol>

          <button type="button" className="boton boton-secundario" onClick={() => setLineas((ls) => [...ls, lineaVacia()])}>
            + Agregar línea
          </button>
        </fieldset>

        <div className="resumen" aria-live="polite">
          <p>
            Subtotal estimado: <strong>{formatoColones(subtotalEstimado)}</strong>
          </p>
          <p className="texto-suave">
            Precio × cantidad, antes de descuentos e IVA. El total exacto se calcula al emitir.
          </p>
        </div>

        <MensajeError error={errorEnvio} />

        <button type="submit" className="boton boton-principal" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar y continuar a emitir'}
        </button>
      </form>
    </section>
  );
}
