// Diálogo para confirmar una acción que no se puede deshacer fácilmente
// (por ejemplo, eliminar un producto).
//
// Usa el elemento <dialog> del navegador con showModal(): el navegador ya
// encierra el foco dentro del diálogo, cierra con Escape y, al cerrar,
// devuelve el foco al botón que lo abrió. El foco empieza en «Cancelar»,
// que es la opción segura.
import { useEffect, useId, useRef } from 'react';

function Confirmar({ abierto, titulo, children, textoConfirmar, ocupado, alConfirmar, alCancelar }) {
  const dialogo = useRef(null);
  const idTitulo = useId();

  useEffect(() => {
    const d = dialogo.current;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={dialogo}
      className="dialogo"
      aria-labelledby={idTitulo}
      // Escape: el navegador dispara "cancel". Mientras se está eliminando
      // no se deja cerrar, para no perder la respuesta.
      onCancel={(e) => {
        e.preventDefault();
        if (!ocupado) alCancelar();
      }}
    >
      <h2 id={idTitulo}>{titulo}</h2>
      <div className="dialogo-cuerpo">{children}</div>
      <div className="dialogo-botones">
        <button type="button" className="boton boton-secundario" onClick={alCancelar} disabled={ocupado} autoFocus>
          Cancelar
        </button>
        <button type="button" className="boton boton-peligro-lleno" onClick={alConfirmar} disabled={ocupado}>
          {ocupado ? 'Eliminando…' : textoConfirmar}
        </button>
      </div>
    </dialog>
  );
}

export { Confirmar };
