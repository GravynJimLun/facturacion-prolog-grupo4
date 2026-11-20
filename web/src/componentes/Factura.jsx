// Piezas compartidas por el detalle (#22) y la pantalla de emitir (#21).
import { formatoColones } from '../formato.js';

// Errores del motor. El motor ya manda cada mensaje en lenguaje claro
// (contrato §3.3), así que aquí no se traduce ningún código.
function ListaErrores({ errores, titulo = 'Por qué se rechazó' }) {
  return (
    <div className="aviso aviso-error">
      <p className="aviso-titulo">{titulo}</p>
      <ul>
        {errores.map((e, i) => (
          <li key={`${e.codigo}-${i}`}>{e.mensaje}</li>
        ))}
      </ul>
    </div>
  );
}

// Subtotal, IVA y total de una factura emitida.
function Totales({ factura }) {
  return (
    <dl className="totales">
      <div>
        <dt>Subtotal</dt>
        <dd>{formatoColones(factura.subtotal)}</dd>
      </div>
      <div>
        <dt>IVA</dt>
        <dd>{formatoColones(factura.iva)}</dd>
      </div>
      <div className="totales-total">
        <dt>Total</dt>
        <dd>{formatoColones(factura.total)}</dd>
      </div>
    </dl>
  );
}

export { ListaErrores, Totales };
