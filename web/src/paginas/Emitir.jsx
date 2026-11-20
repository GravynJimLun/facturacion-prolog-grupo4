// Emitir factura (issue #21): llama a la API, que calcula con el motor
// Prolog, y muestra el estado, el subtotal, el IVA y el total. Si la
// factura sale rechazada, muestra los errores en lenguaje claro.
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, USAR_DATOS_DE_PRUEBA } from '../api.js';
import { useDatos } from '../usarDatos.js';
import { Cargando, InsigniaEstado, MensajeError } from '../componentes/Estados.jsx';
import { ListaErrores, Totales } from '../componentes/Factura.jsx';
import { etiqueta, nombreLegible } from '../formato.js';

// La llave (key) hace que React cree la pantalla de cero al pasar de una
// factura a otra. Sin ella, al ir de /facturas/5/emitir a /facturas/2/emitir
// se seguía mostrando el resultado de la factura 5.
export default function Emitir() {
  const { id } = useParams();
  return <EmitirFactura key={id} id={id} />;
}

function EmitirFactura({ id }) {
  const factura = useDatos(() => api.factura(id), [id]);
  const [envio, setEnvio] = useState({ enviando: false, resultado: null, error: null });
  const tituloResultado = useRef(null);

  // Cuando llega el resultado, el foco pasa a su título: así un lector de
  // pantalla lo anuncia y quien usa teclado sigue desde ahí.
  useEffect(() => {
    if (envio.resultado || envio.error) tituloResultado.current?.focus();
  }, [envio.resultado, envio.error]);

  async function emitir() {
    setEnvio({ enviando: true, resultado: null, error: null });
    try {
      const resultado = await api.emitirFactura(id);
      setEnvio({ enviando: false, resultado, error: null });
    } catch (error) {
      setEnvio({ enviando: false, resultado: null, error });
    }
  }

  if (factura.cargando) return <Cargando texto="Cargando la factura…" />;
  if (factura.error) {
    return (
      <section>
        <h1>Emitir factura N.º {id}</h1>
        <MensajeError error={factura.error} alReintentar={factura.error.status === 404 ? null : factura.recargar} />
        <Link to="/historial">Volver al historial</Link>
      </section>
    );
  }

  const f = factura.datos;
  const { resultado, error, enviando } = envio;
  const yaEmitida = f.estado === 'emitida' || error?.status === 409;

  return (
    <section>
      <h1>Emitir factura N.º {f.id}</h1>

      <div className="resumen">
        <p>
          <span className="etiqueta">Cliente:</span> {nombreLegible(f.cliente.nombre)} ({etiqueta(f.cliente.tipo)},{' '}
          {etiqueta(f.cliente.nivel).toLowerCase()})
        </p>
        <p>
          <span className="etiqueta">Forma de pago:</span> {etiqueta(f.formaPago)}
        </p>
        <p>
          <span className="etiqueta">Líneas:</span> {f.lineas.length}
        </p>
      </div>

      {/* Antes de emitir */}
      {!resultado && !yaEmitida && (
        <>
          {f.estado === 'rechazada' && (
            <ListaErrores errores={f.errores} titulo="La última vez se rechazó por esto" />
          )}
          <p className="texto-suave">
            Al emitir, el motor de reglas calcula los descuentos y el IVA, y revisa el stock y la forma de pago.
          </p>
          <button type="button" className="boton boton-principal" onClick={emitir} disabled={enviando}>
            {enviando ? 'Emitiendo…' : 'Emitir factura'}
          </button>
          {enviando && <Cargando texto="Calculando la factura…" />}
        </>
      )}

      {/* La factura ya estaba emitida (al cargar o porque la API respondió 409) */}
      {yaEmitida && !resultado && (
        <div className="aviso aviso-info">
          <p className="aviso-titulo" ref={tituloResultado} tabIndex={-1}>
            Esta factura ya fue emitida.
          </p>
          <p>No se puede emitir dos veces.</p>
        </div>
      )}

      {/* Error de conexión o del servidor */}
      {error && error.status !== 409 && (
        <>
          <h2 className="solo-lector" ref={tituloResultado} tabIndex={-1}>
            No se pudo emitir
          </h2>
          <MensajeError error={error} alReintentar={emitir} />
        </>
      )}

      {/* Resultado del motor */}
      {resultado && (
        <div className="resultado">
          <h2 ref={tituloResultado} tabIndex={-1} className="titulo-con-estado">
            {resultado.estado === 'emitida' ? 'Factura emitida' : 'Factura rechazada'}
            <InsigniaEstado estado={resultado.estado} />
          </h2>
          {resultado.estado === 'emitida' ? (
            <>
              <Totales factura={resultado} />
              {USAR_DATOS_DE_PRUEBA && f.id > 6 && (
                <p className="texto-suave">
                  <small>
                    Modo de prueba: no hay motor de reglas, así que una factura nueva siempre sale con los montos de
                    ejemplo de la factura 2. Con el backend encendido, el motor calcula los montos reales.
                  </small>
                </p>
              )}
            </>
          ) : (
            <>
              <ListaErrores errores={resultado.errores} titulo="Hay que corregir lo siguiente:" />
              <p className="texto-suave">
                Una factura rechazada no cambia el stock ni cuenta en los reportes. Puede crear una nueva con los
                cambios.
              </p>
            </>
          )}
        </div>
      )}

      <p className="acciones">
        {(resultado || yaEmitida) && <Link to={`/facturas/${f.id}`}>Ver el detalle línea por línea</Link>}
        {resultado?.estado === 'rechazada' && <Link to="/nueva">Crear una factura nueva</Link>}
        <Link to="/historial">Volver al historial</Link>
      </p>
    </section>
  );
}
