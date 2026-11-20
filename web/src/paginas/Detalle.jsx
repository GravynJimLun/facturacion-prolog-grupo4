// Detalle de factura (issue #22): línea por línea, con el precio, el
// descuento aplicado, la base y el IVA. Todos los montos vienen del motor
// Prolog (contrato §4.5); aquí solo se muestran, no se recalculan.
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useDatos } from '../usarDatos.js';
import { Cargando, InsigniaEstado, MensajeError } from '../componentes/Estados.jsx';
import { ListaErrores, Totales } from '../componentes/Factura.jsx';
import { etiqueta, formatoColones, formatoFecha, nombreLegible } from '../formato.js';

// Explica qué descuentos se aplicaron. Se encadenan: primero el de
// volumen y luego, sobre ese precio, el del nivel del cliente.
function textoDescuento(linea, nivel) {
  if (linea.descVolumen === null) return '—';
  const partes = [];
  if (linea.descVolumen) partes.push(`${linea.descVolumen} % por volumen`);
  if (linea.descCliente) partes.push(`${linea.descCliente} % por cliente ${etiqueta(nivel).toLowerCase()}`);
  return partes.length ? partes.join(', luego ') : 'Sin descuento';
}

function textoIva(linea, exonerado) {
  if (linea.iva === null) return '—';
  if (exonerado) return 'Exonerado';
  return `${formatoColones(linea.iva)} (${linea.tarifaIva} %)`;
}

export default function Detalle() {
  const { id } = useParams();
  const { datos: factura, cargando, error, recargar } = useDatos(() => api.factura(id), [id]);

  if (cargando) return <Cargando texto="Cargando la factura…" />;
  if (error) {
    return (
      <section>
        <h1>Factura N.º {id}</h1>
        <MensajeError error={error} alReintentar={error.status === 404 ? null : recargar} />
        <Link to="/historial">Volver al historial</Link>
      </section>
    );
  }

  const { cliente } = factura;
  const exonerado = cliente.tipo === 'exonerado';
  const pendiente = factura.estado === 'pendiente';

  return (
    <section>
      <div className="titulo-con-estado">
        <h1>Factura N.º {factura.id}</h1>
        <InsigniaEstado estado={factura.estado} />
      </div>

      <dl className="ficha">
        <div>
          <dt>Cliente</dt>
          <dd>{nombreLegible(cliente.nombre)}</dd>
        </div>
        <div>
          <dt>Tipo y nivel</dt>
          <dd>
            {etiqueta(cliente.tipo)} · {etiqueta(cliente.nivel)}
          </dd>
        </div>
        <div>
          <dt>Forma de pago</dt>
          <dd>{etiqueta(factura.formaPago)}</dd>
        </div>
        <div>
          <dt>Creada</dt>
          <dd>{formatoFecha(factura.creadaEn)}</dd>
        </div>
      </dl>

      {factura.estado === 'rechazada' && <ListaErrores errores={factura.errores} />}

      {factura.estado !== 'emitida' && (
        <p className="acciones">
          <Link className="boton boton-principal" to={`/facturas/${factura.id}/emitir`}>
            {pendiente ? 'Emitir factura' : 'Intentar emitir de nuevo'}
          </Link>
        </p>
      )}

      <h2>Líneas</h2>
      {pendiente && (
        <p className="texto-suave">
          Los descuentos, la base y el IVA se calculan cuando la factura se emite.
        </p>
      )}
      {factura.lineas.length === 0 ? (
        <p>Esta factura no tiene líneas.</p>
      ) : (
        <div className="tabla-scroll">
          <table className="tabla tabla-apilable">
            <caption className="solo-lector">Líneas de la factura {factura.id}</caption>
            <thead>
              <tr>
                <th scope="col">Producto</th>
                <th scope="col" className="num">Cantidad</th>
                <th scope="col" className="num">Precio unitario</th>
                <th scope="col">Descuento aplicado</th>
                <th scope="col" className="num">Base</th>
                <th scope="col" className="num">IVA</th>
              </tr>
            </thead>
            <tbody>
              {factura.lineas.map((l, i) => (
                <tr key={`${l.productoCod}-${i}`}>
                  <td data-titulo="Producto">
                    <span>
                      {nombreLegible(l.productoNombre)}
                      {l.categoria && <small className="texto-suave bloque">{etiqueta(l.categoria)}</small>}
                    </span>
                  </td>
                  <td data-titulo="Cantidad" className="num">{l.cantidad}</td>
                  <td data-titulo="Precio unitario" className="num">{formatoColones(l.precioUnitario)}</td>
                  <td data-titulo="Descuento">{textoDescuento(l, cliente.nivel)}</td>
                  <td data-titulo="Base" className="num">{formatoColones(l.base)}</td>
                  <td data-titulo="IVA" className="num">{textoIva(l, exonerado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {factura.estado === 'emitida' && <Totales factura={factura} />}

      <p>
        <Link to="/historial">Volver al historial</Link>
      </p>
    </section>
  );
}
