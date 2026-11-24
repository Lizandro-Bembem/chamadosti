import { pool } from './db.js';
import { idsEquipeTI, notificar } from './notificacoes.js';
import { numeroChamado, nomeCategoria } from './catalogo.js';

const INTERVALO_MS = 60 * 1000;

/**
 * Avisa quando um chamado em aberto já consumiu 75% do tempo de SLA.
 * O aviso vai para o técnico responsável ou, se não houver, para toda a equipe de TI.
 */
async function verificarSla() {
  const { rows } = await pool.query(
    `UPDATE chamados
        SET sla_alertado = TRUE
      WHERE status NOT IN ('resolvido', 'fechado')
        AND NOT sla_alertado
        AND now() >= sla_limite - (sla_limite - criado_em) * 0.25
      RETURNING id, categoria, tecnico_id, sla_limite,
                GREATEST(0, CEIL(EXTRACT(EPOCH FROM sla_limite - now()) / 60))::int AS minutos`,
  );
  if (rows.length === 0) return;

  const equipe = await idsEquipeTI(pool);
  for (const c of rows) {
    const quando = c.minutos > 0 ? `vence em ${c.minutos} min` : 'está vencido';
    await notificar(pool, c.tecnico_id ? [c.tecnico_id] : equipe, {
      chamadoId: c.id,
      tipo: 'sla',
      mensagem: `SLA do chamado ${numeroChamado(c.id)} (${nomeCategoria(c.categoria)}) ${quando}.`,
    });
  }
}

export function iniciarMonitorSla() {
  const executar = () => verificarSla().catch((e) => console.error('Erro ao verificar SLA:', e.message));
  executar();
  return setInterval(executar, INTERVALO_MS);
}
