// Crear (#/productos/nuevo) y editar (#/productos/{cod}/editar) un producto.
//
// El código de un producto nuevo no se escribe: lo genera Neon al guardar
// (sql/004), así nunca se repite.
//
// Aquí solo se revisa la FORMA de los datos: que precio y stock sean
// números. Las REGLAS (precio
// mayor que 0, nombre repetido, categoría con tarifa de IVA, etc.) las
// revisa el motor Prolog en el backend, y sus mensajes se muestran debajo
// de cada campo (contrato §3.7 y §4.9).
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useDatos } from '../usarDatos.js';
import { Cargando, MensajeError } from '../componentes/Estados.jsx';
import { etiqueta, nombreLegible } from '../formato.js';

const CATEGORIAS = ['general', 'medicamento', 'canasta', 'exento'];

// La llave hace que React empiece de cero al pasar de un producto a otro.
export default function ProductoFormulario() {
  const { cod } = useParams();
  return <CargarProducto key={cod ?? 'nuevo'} cod={cod} />;
}

function CargarProducto({ cod }) {
  const { datos: catalogo, cargando, error, recargar } = useDatos(() => api.productos(), []);
  const editar = cod !== undefined;

  if (cargando) return <Cargando texto="Cargando el producto…" />;
  if (error) return <MensajeError error={error} alReintentar={recargar} />;

  if (editar) {
    const producto = catalogo.find((p) => p.cod === cod && p.tipo === 'producto');
    if (!producto) {
      return (
        <section>
          <h1>Editar producto</h1>
          <div className="aviso aviso-error" role="alert">
            <p className="aviso-titulo">No existe el producto {cod}.</p>
            <p>Puede que lo hayan eliminado.</p>
          </div>
          <Link to="/productos">Volver a productos</Link>
        </section>
      );
    }
    return (
      <Formulario editar inicial={{ ...producto, precio: String(producto.precio), stock: String(producto.stock) }} />
    );
  }

  return <Formulario inicial={{ nombre: '', categoria: 'general', precio: '', stock: '0' }} />;
}

// Errores de forma: { campo: mensaje }.
function validarForma(v) {
  const errores = {};
  for (const campo of ['precio', 'stock']) {
    if (v[campo].trim() === '' || !Number.isFinite(Number(v[campo]))) errores[campo] = 'Escriba un número.';
  }
  return errores;
}

function Formulario({ inicial, editar = false }) {
  const navegar = useNavigate();
  const [valores, setValores] = useState(inicial);
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorServidor, setErrorServidor] = useState(null);
  // Mensajes del motor por campo; se borra el de un campo cuando se edita.
  const [erroresMotor, setErroresMotor] = useState({});
  const resumen = useRef(null);

  const erroresForma = validarForma(valores);
  const errorDe = (campo) => (intentoEnviar && erroresForma[campo]) || erroresMotor[campo];

  // Si el servidor rechaza, el foco va al resumen de errores: así un
  // lector de pantalla lo lee y quien usa teclado sabe qué pasó.
  useEffect(() => {
    if (errorServidor) resumen.current?.focus();
  }, [errorServidor]);

  function cambiar(campo, valor) {
    setValores((v) => ({ ...v, [campo]: valor }));
    setErroresMotor(({ [campo]: _, ...resto }) => resto);
  }

  async function enviar(e) {
    e.preventDefault();
    setIntentoEnviar(true);
    if (Object.keys(erroresForma).length > 0) return;

    setEnviando(true);
    setErrorServidor(null);
    const datos = {
      nombre: valores.nombre,
      categoria: valores.categoria,
      precio: Number(valores.precio),
      stock: Number(valores.stock),
    };
    try {
      const guardado = editar ? await api.actualizarProducto(valores.cod, datos) : await api.crearProducto(datos);
      const nombre = nombreLegible(guardado.nombre);
      navegar('/productos', {
        state: {
          aviso: editar ? `Se guardaron los cambios de ${nombre}.` : `Se creó el producto ${nombre} (${guardado.cod}).`,
        },
      });
    } catch (err) {
      // Un campo puede tener más de un mensaje del motor: se juntan.
      const porCampo = {};
      for (const { campo, mensaje } of err.errores ?? []) {
        porCampo[campo] = porCampo[campo] ? `${porCampo[campo]} ${mensaje}` : mensaje;
      }
      setErroresMotor(porCampo);
      setErrorServidor(err);
      setEnviando(false);
    }
  }

  // Props comunes de cada campo: id, valor, estado de error y descripción.
  const propsCampo = (campo) => ({
    id: `producto-${campo}`,
    value: valores[campo],
    onChange: (e) => cambiar(campo, e.target.value),
    'aria-invalid': !!errorDe(campo),
    'aria-describedby': errorDe(campo) ? `error-${campo}` : undefined,
  });
  const errorCampo = (campo) =>
    errorDe(campo) ? (
      <p id={`error-${campo}`} className="error-campo">
        {errorDe(campo)}
      </p>
    ) : null;

  return (
    <section>
      <h1>{editar ? `Editar ${nombreLegible(inicial.nombre)}` : 'Nuevo producto'}</h1>

      <form onSubmit={enviar} noValidate>
        <div ref={resumen} tabIndex={-1}>
          <MensajeError error={errorServidor} />
        </div>

        <fieldset>
          <legend>Datos del producto</legend>
          <div className="fila-campos">
            <div className="campo">
              <label htmlFor="producto-cod">Código</label>
              <input
                id="producto-cod"
                value={editar ? valores.cod : 'Se asigna al guardar'}
                readOnly
                aria-describedby="ayuda-cod"
              />
              <p id="ayuda-cod" className="texto-suave ayuda">
                {editar
                  ? 'El código no se puede cambiar: las facturas lo usan.'
                  : 'El sistema le da el siguiente código libre (p8, p9…) y nunca lo repite.'}
              </p>
            </div>

            <div className="campo">
              <label htmlFor="producto-nombre">Nombre</label>
              <input {...propsCampo('nombre')} maxLength={80} autoComplete="off" />
              {errorCampo('nombre')}
            </div>
          </div>

          <div className="fila-campos">
            <div className="campo">
              <label htmlFor="producto-categoria">Categoría (tarifa de IVA)</label>
              <select {...propsCampo('categoria')}>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {etiqueta(c)}
                  </option>
                ))}
              </select>
              {errorCampo('categoria')}
            </div>

            <div className="campo">
              <label htmlFor="producto-precio">Precio (colones)</label>
              <input {...propsCampo('precio')} type="number" inputMode="numeric" step="1" />
              {errorCampo('precio')}
            </div>

            <div className="campo">
              <label htmlFor="producto-stock">Stock (unidades)</label>
              <input {...propsCampo('stock')} type="number" inputMode="numeric" step="1" />
              {errorCampo('stock')}
            </div>
          </div>
        </fieldset>

        <p className="texto-suave">Al guardar, el motor de reglas en Prolog revisa que el producto sea válido.</p>

        <div className="acciones">
          <button type="submit" className="boton boton-principal" disabled={enviando}>
            {enviando ? 'Guardando…' : editar ? 'Guardar cambios' : 'Crear producto'}
          </button>
          <Link to="/productos" className="boton boton-secundario">
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  );
}
