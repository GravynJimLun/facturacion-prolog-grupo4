// Componentes comunes para cargas, errores y estados de factura.
import { etiqueta } from '../formato.js';

// Indicador de carga. role="status" hace que un lector de pantalla lo anuncie.
function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="cargando" role="status">
      <span className="spinner" aria-hidden="true" />
      {texto}
    </div>
  );
}

// Mensaje de error amable, con los detalles del backend y un botón para reintentar.
function MensajeError({ error, alReintentar }) {
  if (!error) return null;
  return (
    <div className="aviso aviso-error" role="alert">
      <p className="aviso-titulo">{error.message}</p>
      {error.detalles?.length > 0 && (
        <ul>
          {error.detalles.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
      {alReintentar && (
        <button type="button" className="boton boton-secundario" onClick={alReintentar}>
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}

// Etiqueta de color para el estado de una factura (el texto también lo dice,
// no solo el color).
function InsigniaEstado({ estado }) {
  return <span className={`insignia insignia-${estado}`}>{etiqueta(estado)}</span>;
}

export { Cargando, MensajeError, InsigniaEstado };
