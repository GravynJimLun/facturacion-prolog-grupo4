// Historial (issue #23): lista de facturas con filtros por estado y por cliente.
// Los filtros se guardan en la dirección (?estado=&cliente=), así se puede
// compartir o recargar la página sin perderlos.
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useDatos } from '../usarDatos.js';
import { Cargando, InsigniaEstado, MensajeError } from '../componentes/Estados.jsx';
import { etiqueta, formatoColones, formatoFecha, nombreLegible } from '../formato.js';

export default function Historial() {
  const [params, setParams] = useSearchParams();
  const estado = params.get('estado') ?? '';
  const cliente = params.get('cliente') ?? '';

  const clientes = useDatos(() => api.clientes(), []);
  const facturas = useDatos(() => api.facturas({ estado, cliente }), [estado, cliente]);

  const cambiarFiltro = (nombre, valor) => {
    const nuevos = new URLSearchParams(params);
    if (valor) nuevos.set(nombre, valor);
    else nuevos.delete(nombre);
    setParams(nuevos, { replace: true });
  };

  return (
    <section>
      <h1>Historial de facturas</h1>

      <form className="filtros" onSubmit={(e) => e.preventDefault()}>
        <div className="campo">
          <label htmlFor="filtro-estado">Estado</label>
          <select id="filtro-estado" value={estado} onChange={(e) => cambiarFiltro('estado', e.target.value)}>
            <option value="">Todos</option>
            {['pendiente', 'emitida', 'rechazada'].map((e) => (
              <option key={e} value={e}>
                {etiqueta(e)}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="filtro-cliente">Cliente</label>
          <select
            id="filtro-cliente"
            value={cliente}
            onChange={(e) => cambiarFiltro('cliente', e.target.value)}
            disabled={!clientes.datos}
          >
            <option value="">Todos</option>
            {(clientes.datos ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {nombreLegible(c.nombre)}
              </option>
            ))}
          </select>
        </div>
        {(estado || cliente) && (
          <button type="button" className="boton boton-secundario" onClick={() => setParams({}, { replace: true })}>
            Quitar filtros
          </button>
        )}
      </form>

      {facturas.cargando && <Cargando texto="Cargando facturas…" />}
      <MensajeError error={facturas.error} alReintentar={facturas.recargar} />

      {facturas.datos && !facturas.cargando && (
        <>
          <p className="texto-suave" aria-live="polite">
            {facturas.datos.length === 1 ? '1 factura' : `${facturas.datos.length} facturas`}
          </p>
          {facturas.datos.length === 0 ? (
            <p>No hay facturas con esos filtros.</p>
          ) : (
            <div className="tabla-scroll">
              <table className="tabla tabla-apilable">
                <thead>
                  <tr>
                    <th scope="col">N.º</th>
                    <th scope="col">Cliente</th>
                    <th scope="col">Pago</th>
                    <th scope="col">Estado</th>
                    <th scope="col" className="num">Total</th>
                    <th scope="col">Fecha</th>
                    <th scope="col">
                      <span className="solo-lector">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.datos.map((f) => (
                    <tr key={f.id}>
                      <td data-titulo="N.º">{f.id}</td>
                      <td data-titulo="Cliente">{nombreLegible(f.clienteNombre)}</td>
                      <td data-titulo="Pago">{etiqueta(f.formaPago)}</td>
                      <td data-titulo="Estado">
                        <InsigniaEstado estado={f.estado} />
                      </td>
                      <td data-titulo="Total" className="num">
                        {formatoColones(f.total)}
                      </td>
                      <td data-titulo="Fecha">{formatoFecha(f.creadaEn)}</td>
                      <td data-titulo="Acciones" className="acciones">
                        <Link to={`/facturas/${f.id}`}>Ver detalle</Link>
                        {f.estado !== 'emitida' && <Link to={`/facturas/${f.id}/emitir`}>Emitir</Link>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
