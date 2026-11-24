import pg from 'pg';
import { config } from './config.js';

// COUNT(*) retorna bigint (texto por padrão) e médias retornam numeric: converte para número.
pg.types.setTypeParser(20, (v) => parseInt(v, 10));
pg.types.setTypeParser(1700, (v) => parseFloat(v));

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  options: `-c timezone=${config.timezone}`,
});

export const query = (text, params) => pool.query(text, params);

export async function transacao(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
}
