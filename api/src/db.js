// Conexión a Neon (PostgreSQL) con el paquete pg.
//
// REGLA DE SEGURIDAD: todas las consultas usan parámetros ($1, $2, ...).
// Nunca se arma el SQL concatenando texto que viene del usuario, porque
// eso permite la inyección SQL (guía §4).
import pg from 'pg';

// SUM() y COUNT() devuelven bigint, y pg los entrega como texto para no
// perder precisión. Los montos de este sistema caben de sobra en un
// Number de JavaScript, así que se convierten a número.
pg.types.setTypeParser(pg.types.builtins.INT8, (valor) => Number(valor));
// NUMERIC (precio unitario de los kits, que puede tener decimales).
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (valor) => Number(valor));

function crearDb(databaseUrl) {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 5 });

  // Si Neon cierra una conexión inactiva, no debe tumbar el servidor.
  pool.on('error', (err) => console.error('Error en una conexión inactiva de Neon:', err.message));

  return {
    // Consulta suelta: db.query('SELECT ... WHERE id = $1', [id])
    query: (texto, parametros) => pool.query(texto, parametros),

    // Ejecuta varias consultas en UNA transacción: o se guardan todas o
    // ninguna. La función recibe un cliente con el mismo método query.
    async transaccion(fn) {
      const cliente = await pool.connect();
      try {
        await cliente.query('BEGIN');
        const resultado = await fn(cliente);
        await cliente.query('COMMIT');
        return resultado;
      } catch (err) {
        await cliente.query('ROLLBACK');
        throw err;
      } finally {
        cliente.release();
      }
    },

    cerrar: () => pool.end(),
  };
}

export { crearDb };
