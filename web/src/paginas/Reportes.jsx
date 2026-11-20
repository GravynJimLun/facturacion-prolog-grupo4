// Reportes (issue #24): ventas totales, IVA por pagar, producto más vendido
// y un gráfico de unidades vendidas por producto.
//
// El gráfico es HTML con CSS, no un <canvas>: así cada barra lleva su
// nombre y su valor como texto, que un lector de pantalla sí puede leer.
// Además se puede ver como tabla.
import { api } from '../api.js';
import { useDatos } from '../usarDatos.js';
import { Cargando, MensajeError } from '../componentes/Estados.jsx';
import { formatoColones, nombreLegible } from '../formato.js';

const formatoUnidades = (n) => `${n.toLocaleString('es-CR')} ${n === 1 ? 'unidad' : 'unidades'}`;

function Tarjeta({ titulo, valor, nota }) {
  return (
    <div className="tarjeta">
      <dt>{titulo}</dt>
      <dd>
        <span className="tarjeta-valor">{valor}</span>
        {nota && <span className="tarjeta-nota">{nota}</span>}
      </dd>
    </div>
  );
}

// Barras horizontales ordenadas de mayor a menor. Una sola serie, un solo
// color: no hace falta leyenda porque el título dice qué se mide.
function GraficoUnidades({ datos }) {
  const ordenados = [...datos].sort((a, b) => b.unidades - a.unidades || a.nombre.localeCompare(b.nombre));
  const maximo = Math.max(...ordenados.map((d) => d.unidades), 1);

  return (
    <figure className="grafico">
      <figcaption id="titulo-grafico" className="grafico-titulo">
        Unidades vendidas por producto
      </figcaption>
      <ul className="barras" aria-labelledby="titulo-grafico">
        {ordenados.map((d) => (
          <li key={d.productoCod} className="barra-fila" title={`${nombreLegible(d.nombre)}: ${formatoUnidades(d.unidades)}`}>
            <span className="barra-nombre">{nombreLegible(d.nombre)}</span>
            <span className="barra-pista" aria-hidden="true">
              <span className="barra" style={{ width: `${(d.unidades / maximo) * 100}%` }} />
            </span>
            <span className="barra-valor">
              {d.unidades.toLocaleString('es-CR')}
              <span className="solo-lector"> {d.unidades === 1 ? 'unidad' : 'unidades'}</span>
            </span>
          </li>
        ))}
      </ul>

      <details className="ver-tabla">
        <summary>Ver como tabla</summary>
        <table className="tabla">
          <caption className="solo-lector">Unidades vendidas por producto</caption>
          <thead>
            <tr>
              <th scope="col">Producto</th>
              <th scope="col">Código</th>
              <th scope="col" className="num">Unidades</th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map((d) => (
              <tr key={d.productoCod}>
                <td>{nombreLegible(d.nombre)}</td>
                <td>{d.productoCod}</td>
                <td className="num">{d.unidades.toLocaleString('es-CR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

export default function Reportes() {
  const { datos, cargando, error, recargar } = useDatos(() => api.reportes(), []);

  return (
    <section>
      <h1>Reportes</h1>
      <p className="texto-suave">
        Solo cuentan las facturas emitidas. Las rechazadas y las pendientes no suman.
      </p>

      {cargando && <Cargando texto="Cargando reportes…" />}
      <MensajeError error={error} alReintentar={recargar} />

      {datos && !cargando && (
        <>
          <dl className="tarjetas">
            <Tarjeta titulo="Ventas totales" valor={formatoColones(datos.ventasTotales)} nota="IVA incluido" />
            <Tarjeta titulo="IVA por pagar" valor={formatoColones(datos.ivaPorPagar)} />
            <Tarjeta
              titulo="Producto más vendido"
              valor={datos.productoMasVendido ? nombreLegible(datos.productoMasVendido.nombre) : 'Sin ventas'}
              nota={datos.productoMasVendido && formatoUnidades(datos.productoMasVendido.unidades)}
            />
            <Tarjeta titulo="Siguiente factura" valor={`N.º ${datos.siguienteConsecutivo}`} />
          </dl>

          {datos.unidadesPorProducto.length === 0 ? (
            <p>Todavía no hay facturas emitidas.</p>
          ) : (
            <GraficoUnidades datos={datos.unidadesPorProducto} />
          )}
          <p className="texto-suave">
            <small>Un kit cuenta como una unidad del kit, no de cada uno de sus componentes.</small>
          </p>
        </>
      )}
    </section>
  );
}
