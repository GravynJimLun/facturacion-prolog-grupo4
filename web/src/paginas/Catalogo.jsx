// Catálogo (issue #19): productos y kits con categoría, precio y stock.
import { useMemo, useState } from 'react';
import { api } from '../api.js';
import { useDatos } from '../usarDatos.js';
import { Cargando, MensajeError } from '../componentes/Estados.jsx';
import { etiqueta, formatoColones, nombreLegible } from '../formato.js';

export default function Catalogo() {
  const { datos: productos, cargando, error, recargar } = useDatos(() => api.productos(), []);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (productos ?? []).filter(
      (p) =>
        (!categoria || p.categoria === categoria) &&
        (!texto || p.cod.toLowerCase().includes(texto) || nombreLegible(p.nombre).toLowerCase().includes(texto)),
    );
  }, [productos, busqueda, categoria]);

  const nombrePorCodigo = useMemo(
    () => Object.fromEntries((productos ?? []).map((p) => [p.cod, nombreLegible(p.nombre)])),
    [productos],
  );

  return (
    <section>
      <h1>Catálogo</h1>

      <form className="filtros" onSubmit={(e) => e.preventDefault()} role="search">
        <div className="campo">
          <label htmlFor="busqueda">Buscar</label>
          <input
            id="busqueda"
            type="search"
            placeholder="Nombre o código"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="campo">
          <label htmlFor="categoria">Categoría</label>
          <select id="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Todas</option>
            {['general', 'medicamento', 'canasta', 'exento'].map((c) => (
              <option key={c} value={c}>
                {etiqueta(c)}
              </option>
            ))}
          </select>
        </div>
      </form>

      {cargando && <Cargando texto="Cargando el catálogo…" />}
      <MensajeError error={error} alReintentar={recargar} />

      {productos && (
        <>
          <p className="texto-suave" aria-live="polite">
            {visibles.length} de {productos.length} artículos
          </p>
          <div className="tabla-scroll">
            <table className="tabla tabla-apilable">
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Nombre</th>
                  <th scope="col">Categoría (IVA)</th>
                  <th scope="col" className="num">Precio</th>
                  <th scope="col" className="num">Stock</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => (
                  <tr key={p.cod}>
                    <td data-titulo="Código">{p.cod}</td>
                    <td data-titulo="Nombre">
                      {nombreLegible(p.nombre)}
                      {p.tipo === 'kit' && (
                        <>
                          {' '}
                          <span className="insignia insignia-kit">Kit</span>
                          <br />
                          <small className="texto-suave">
                            Incluye: {p.componentes.map((c) => nombrePorCodigo[c] ?? c).join(', ')}
                          </small>
                        </>
                      )}
                    </td>
                    <td data-titulo="Categoría">{etiqueta(p.categoria)}</td>
                    <td data-titulo="Precio" className="num">
                      {formatoColones(p.precio)}
                    </td>
                    <td data-titulo="Stock" className="num">
                      {p.tipo === 'kit' ? (
                        <span className="texto-suave">Según sus componentes</span>
                      ) : (
                        p.stock.toLocaleString('es-CR')
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visibles.length === 0 && <p>No hay artículos que coincidan con la búsqueda.</p>}
        </>
      )}
    </section>
  );
}
