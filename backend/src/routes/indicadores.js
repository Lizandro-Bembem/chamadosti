import { Router } from 'express';
import { query } from '../db.js';
import { HttpError } from '../auth.js';
import { config } from '../config.js';

export const indicadoresRouter = Router();

const CONTAGENS = `
  SELECT
    count(*) FILTER (WHERE status = 'aberto')                                          AS abertos,
    count(*) FILTER (WHERE status = 'em_atendimento')                                  AS em_atendimento,
    count(*) FILTER (WHERE status IN ('aguardando_usuario', 'aguardando_fornecedor'))  AS pendentes,
    count(*) FILTER (WHERE resolvido_em >= current_date)                               AS resolvidos_hoje,
    count(*) FILTER (WHERE criado_em >= current_date)                                  AS abertos_hoje,
    count(*) FILTER (WHERE status NOT IN ('resolvido', 'fechado') AND sla_limite < now()) AS sla_vencido
  FROM chamados`;

const LISTA = `
  SELECT c.id, c.nome_usuario, c.setor, c.categoria, c.prioridade, c.status,
         c.sla_limite, c.criado_em, c.tecnico_id, t.nome AS tecnico_nome
    FROM chamados c LEFT JOIN usuarios t ON t.id = c.tecnico_id
   WHERE c.status NOT IN ('resolvido', 'fechado')`;

// Painel do técnico: números do dia + filas de trabalho
indicadoresRouter.get('/painel', async (req, res) => {
  const [contagens, meus, fila, risco] = await Promise.all([
    query(CONTAGENS),
    query(`${LISTA} AND c.tecnico_id = $1 ORDER BY c.sla_limite`, [req.usuario.id]),
    query(`${LISTA} AND c.tecnico_id IS NULL ORDER BY c.sla_limite`),
    query(`${LISTA} AND c.sla_limite < now() + interval '1 hour' ORDER BY c.sla_limite LIMIT 10`),
  ]);
  res.json({
    contagens: contagens.rows[0],
    meus: meus.rows,
    fila: fila.rows,
    sla_em_risco: risco.rows,
  });
});

// Dashboard com gráficos do mês (parâmetro opcional ?mes=AAAA-MM)
indicadoresRouter.get('/dashboard', async (req, res) => {
  const mes = req.query.mes
    ?? new Date().toLocaleDateString('sv-SE', { timeZone: config.timezone }).slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new HttpError(400, 'Mês inválido. Use AAAA-MM.');
  const inicio = `${mes}-01`;

  const doMes = `criado_em >= $1::date AND criado_em < $1::date + interval '1 month'`;
  const resolvidosNoMes = `resolvido_em >= $1::date AND resolvido_em < $1::date + interval '1 month'`;

  const [contagens, resumo, porCategoria, porTecnico, porSetor, porDia] = await Promise.all([
    query(CONTAGENS),
    query(
      `SELECT
         (SELECT count(*) FROM chamados WHERE ${doMes}) AS total_mes,
         count(*) AS resolvidos_mes,
         ROUND(AVG(EXTRACT(EPOCH FROM resolvido_em - criado_em) / 60)) AS tempo_medio_min,
         ROUND(100.0 * count(*) FILTER (WHERE resolvido_em <= sla_limite) / NULLIF(count(*), 0)) AS sla_cumprido_pct
       FROM chamados WHERE ${resolvidosNoMes}`,
      [inicio],
    ),
    query(`SELECT categoria, count(*) AS total FROM chamados WHERE ${doMes} GROUP BY categoria ORDER BY total DESC`, [inicio]),
    query(
      `SELECT COALESCE(t.nome, 'Sem técnico') AS tecnico,
              count(*) AS total,
              count(*) FILTER (WHERE c.resolvido_em IS NOT NULL) AS resolvidos,
              ROUND(AVG(EXTRACT(EPOCH FROM c.resolvido_em - c.criado_em) / 60)) AS tempo_medio_min
         FROM chamados c LEFT JOIN usuarios t ON t.id = c.tecnico_id
        WHERE c.criado_em >= $1::date AND c.criado_em < $1::date + interval '1 month'
        GROUP BY 1 ORDER BY total DESC`,
      [inicio],
    ),
    query(`SELECT setor, count(*) AS total FROM chamados WHERE ${doMes} GROUP BY setor ORDER BY total DESC`, [inicio]),
    query(
      `SELECT to_char(d, 'DD') AS dia, count(c.id) AS total
         FROM generate_series($1::date, $1::date + interval '1 month' - interval '1 day', interval '1 day') d
         LEFT JOIN chamados c ON c.criado_em >= d AND c.criado_em < d + interval '1 day'
        GROUP BY d ORDER BY d`,
      [inicio],
    ),
  ]);

  res.json({
    mes,
    contagens: contagens.rows[0],
    resumo: resumo.rows[0],
    por_categoria: porCategoria.rows,
    por_tecnico: porTecnico.rows,
    por_setor: porSetor.rows,
    por_dia: porDia.rows,
  });
});
