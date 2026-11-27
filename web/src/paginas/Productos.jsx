// Mantenimiento de productos: lista con búsqueda, y botones para crear,
// editar y eliminar (desactivar). Los kits no se editan aquí.
//
// Si un producto se puede eliminar lo decide el motor Prolog en el backend
// (por ejemplo, no se puede si forma parte de un kit). Aquí solo se
// muestra su respuesta.
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useDatos } from '../usarDatos.js';
import { Cargando, MensajeError } from '../componentes/Estados.jsx';
import { Confirmar } from '../componentes/Confirmar.jsx';
import { etiqueta, formatoColones, nombreLegible } from '../formato.js';

export default function Productos() {
  const { datos, cargando, error, recargar } = useDatos(() => api.productos(), []);
  const [busqueda, setBusqueda] = useState('');

  // Aviso que deja el formulario al guardar ("Se creó el producto…"). Se
  // lee una vez y se borra del historial, para que no reaparezca al recargar.
  const ubicacion = useLocation();
  const navegar = useNavigate();
  const [aviso, setAviso] = useState(() => ubicacion.state?.aviso ?? null);
  useEffect(() => {
    if (ubicacion.state?.aviso) navegar(ubicacion.pathname, { replace: true, state: null });
  }, [ubicacion, navegar]);

  const [porEliminar, setPorEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState(null);

  const productos = useMemo(() => (datos ?? []).filter((p) => p.tipo === 'producto'), [datos]);
  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return productos.filter(
      (p) => !texto || p.cod.toLowerCase().includes(texto) || nombreLegible(p.nombre).toLowerCase().includes(texto),
    );
  }, [productos, busqueda]);

  async function eliminar() {
    const producto = porEliminar;
    setEliminando(true);
    setErrorEliminar(null);
    setAviso(null);
    try {
      await api.eliminarProducto(producto.cod);
      setAviso(`Se eliminó el producto ${nombreLegible(producto.nombre)} (${producto.cod}).`);
      recargar();
    } catch (err) {
      // Por ejemplo, 409 del motor: "forma parte de estos kits: k1, k2".
      setErrorEliminar(err);
    } finally {
      setEliminando(false);
      setPorEliminar(null);
    }
  }

  return (
    <section>
      <div className="titulo-con-accion">
        <h1>Productos</h1>
        <Link to="/productos/nuevo" className="boton boton-principal">
          + Nuevo producto
        </Link>
      </div>

      <div role="status">{aviso && <p className="aviso aviso-exito">{aviso}</p>}</div>
      <MensajeError error={errorEliminar} />

      <form className="filtros" onSubmit={(e) => e.preventDefault()} role="search">
        <div className="campo">
          <label htmlFor="busqueda-productos">Buscar</label>
          <input
            id="busqueda-productos"
            type="search"
            placeholder="Nombre o código"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </form>

      {cargando && !datos && <Cargando texto="Cargando los productos…" />}
      <MensajeError error={error} alReintentar={recargar} />

      {datos && (
        <>
          <p className="texto-suave" aria-live="polite">
            {visibles.length} de {productos.length} productos. Los kits se ven en el Catálogo y no se editan aquí.
          </p>
          <div className="tabla-scroll">
            <table className="tabla tabla-apilable">
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Nombre</th>
                  <th scope="col">Categoría (IVA)</th>
                  <th scope="col" className="num">
                    Precio
                  </th>
                  <th scope="col" className="num">
                    Stock
                  </th>
                  <th scope="col">
                    <span className="solo-lector">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => {
                  const nombre = nombreLegible(p.nombre);
                  return (
                    <tr key={p.cod}>
                      <td data-titulo="Código">{p.cod}</td>
                      <td data-titulo="Nombre">{nombre}</td>
                      <td data-titulo="Categoría">{etiqueta(p.categoria)}</td>
                      <td data-titulo="Precio" className="num">
                        {formatoColones(p.precio)}
                      </td>
                      <td data-titulo="Stock" className="num">
                        {p.stock.toLocaleString('es-CR')}
                      </td>
                      <td className="celda-acciones">
                        <div className="botones-fila">
                          <Link
                            to={`/productos/${encodeURIComponent(p.cod)}/editar`}
                            className="boton boton-secundario boton-chico"
                            aria-label={`Editar ${nombre}`}
                          >
                            Editar
                          </Link>
                          <button
                            type="button"
                            className="boton boton-peligro boton-chico"
                            aria-label={`Eliminar ${nombre}`}
                            onClick={() => {
                              setErrorEliminar(null);
                              setPorEliminar(p);
                            }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visibles.length === 0 && <p>No hay productos que coincidan con la búsqueda.</p>}
        </>
      )}

      <Confirmar
        abierto={porEliminar !== null}
        titulo="¿Eliminar este producto?"
        textoConfirmar="Sí, eliminar"
        ocupado={eliminando}
        alConfirmar={eliminar}
        alCancelar={() => setPorEliminar(null)}
      >
        {porEliminar && (
          <>
            <p>
              <strong>{nombreLegible(porEliminar.nombre)}</strong> ({porEliminar.cod}) dejará de aparecer en el catálogo
              y no se podrá usar en facturas nuevas.
            </p>
            <p className="texto-suave">Las facturas que ya lo tienen seguirán mostrando su nombre.</p>
          </>
        )}
      </Confirmar>
    </section>
  );
}
