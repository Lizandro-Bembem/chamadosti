import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { config } from '../config.js';
import { query, transacao } from '../db.js';
import { HttpError, ehEquipeTI, exigirEquipeTI } from '../auth.js';
import { idsEquipeTI, notificar } from '../notificacoes.js';
import {
  STATUS, STATUS_FINALIZADOS, avaliarAssistente, categoriaPorId, nomeCategoria,
  nomeStatus, numeroChamado, prioridadePorId,
} from '../catalogo.js';

fs.mkdirSync(config.uploadDir, { recursive: true });

const EXTENSOES_IMAGEM = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${EXTENSOES_IMAGEM[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (EXTENSOES_IMAGEM[file.mimetype]) cb(null, true);
    else cb(new HttpError(400, 'O anexo precisa ser uma imagem (PNG, JPG, GIF ou WEBP).'));
  },
});

const SELECT_CHAMADO = `
  SELECT c.*, t.nome AS tecnico_nome
    FROM chamados c
    LEFT JOIN usuarios t ON t.id = c.tecnico_id`;

const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function registrar(db, chamadoId, usuarioId, descricao, tipo = 'evento') {
  await db.query(
    'INSERT INTO historico (chamado_id, usuario_id, tipo, descricao) VALUES ($1, $2, $3, $4)',
    [chamadoId, usuarioId, tipo, descricao],
  );
}

/** Busca o chamado e garante que o usuário pode vê-lo (usuário comum só vê os próprios). */
async function carregarChamado(db, id, usuario, { bloquear = false } = {}) {
  const numero = Number(id);
  if (!Number.isInteger(numero)) throw new HttpError(404, 'Chamado não encontrado.');
  const { rows } = await db.query(
    `${SELECT_CHAMADO} WHERE c.id = $1 ${bloquear ? 'FOR UPDATE OF c' : ''}`,
    [numero],
  );
  const chamado = rows[0];
  if (!chamado) throw new HttpError(404, 'Chamado não encontrado.');
  if (!ehEquipeTI(usuario) && chamado.solicitante_id !== usuario.id) {
    throw new HttpError(403, 'Você só pode ver os seus próprios chamados.');
  }
  return chamado;
}

/** Muda o status preenchendo as datas de atendimento, resolução e fechamento. */
async function aplicarStatus(db, chamado, novoStatus, autor) {
  await db.query(
    `UPDATE chamados SET
        status = $2::text,
        atualizado_em = now(),
        atendimento_inicio = CASE WHEN $2::text = 'em_atendimento'
                                  THEN COALESCE(atendimento_inicio, now()) ELSE atendimento_inicio END,
        resolvido_em = CASE WHEN $2::text IN ('resolvido', 'fechado')
                            THEN COALESCE(resolvido_em, now()) ELSE NULL END,
        fechado_em = CASE WHEN $2::text = 'fechado' THEN now() ELSE NULL END
      WHERE id = $1`,
    [chamado.id, novoStatus],
  );
  await registrar(db, chamado.id, autor.id,
    `Status alterado: ${nomeStatus(chamado.status)} → ${nomeStatus(novoStatus)}`);
}

export const chamadosRouter = Router();

// Lista com filtros: nome, setor, categoria, tecnico, status, prioridade, data_inicio, data_fim, busca
chamadosRouter.get('/', async (req, res) => {
  const where = [];
  const params = [];
  const filtro = (sql, valor) => {
    params.push(valor);
    where.push(sql.replaceAll('?', `$${params.length}`));
  };
  const q = req.query;

  if (!ehEquipeTI(req.usuario)) filtro('c.solicitante_id = ?', req.usuario.id);
  if (q.nome) filtro('c.nome_usuario ILIKE ?', `%${q.nome}%`);
  if (q.setor) filtro('c.setor = ?', q.setor);
  if (q.categoria) filtro('c.categoria = ?', q.categoria);
  if (q.prioridade) filtro('c.prioridade = ?', q.prioridade);
  if (q.tecnico === 'nenhum') where.push('c.tecnico_id IS NULL');
  else if (q.tecnico) filtro('c.tecnico_id = ?', Number(q.tecnico) || 0);
  if (q.status === 'abertos') where.push("c.status NOT IN ('resolvido', 'fechado')");
  else if (q.status) filtro('c.status = ?', q.status);
  if (q.data_inicio) filtro('c.criado_em >= ?::date', q.data_inicio);
  if (q.data_fim) filtro('c.criado_em < ?::date + 1', q.data_fim);
  if (q.busca) {
    filtro(`(c.descricao ILIKE ? OR c.nome_usuario ILIKE ? OR c.patrimonio ILIKE ?
             OR LPAD(c.id::text, GREATEST(3, length(c.id::text)), '0') LIKE ?)`, `%${String(q.busca).replace(/^#/, '')}%`);
  }

  const { rows } = await query(
    `${SELECT_CHAMADO}
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY (c.status IN ('resolvido', 'fechado')), c.criado_em DESC
     LIMIT 500`,
    params,
  );
  res.json(rows);
});

// Avalia as respostas do Assistente Inteligente antes de abrir o chamado
chamadosRouter.post('/assistente', (req, res) => {
  res.json(avaliarAssistente(req.body?.categoria, req.body?.respostas));
});

// Abertura de chamado (multipart por causa do anexo)
chamadosRouter.post('/', upload.single('anexo'), async (req, res) => {
  const b = req.body ?? {};
  const removerAnexo = () => req.file && fs.rm(req.file.path, { force: true }, () => {});

  const categoria = categoriaPorId(b.categoria);
  const prioridade = prioridadePorId(b.prioridade);
  const dados = {
    nome_usuario: texto(b.nome_usuario, 120) || req.usuario.nome,
    setor: texto(b.setor, 80),
    ramal: texto(b.ramal, 20) || null,
    patrimonio: texto(b.patrimonio, 40) || null,
    descricao: texto(b.descricao, 5000),
  };
  const erros = [];
  if (!categoria) erros.push('categoria');
  if (!prioridade) erros.push('prioridade');
  if (!dados.setor) erros.push('setor');
  if (!dados.descricao) erros.push('descrição');
  if (erros.length) {
    removerAnexo();
    throw new HttpError(400, `Preencha: ${erros.join(', ')}.`);
  }

  let respostas = {};
  try { respostas = JSON.parse(b.respostas || '{}'); } catch { /* respostas inválidas são ignoradas */ }
  const diagnostico = avaliarAssistente(categoria.id, respostas);
  if (diagnostico) diagnostico.solucao_tentada = b.solucao_tentada === 'true';

  try {
    const chamado = await transacao(async (db) => {
      let equipamentoId = null;
      if (dados.patrimonio) {
        const eq = await db.query('SELECT id FROM equipamentos WHERE lower(patrimonio) = lower($1)', [dados.patrimonio]);
        equipamentoId = eq.rows[0]?.id ?? null;
      }
      const { rows } = await db.query(
        `INSERT INTO chamados (solicitante_id, nome_usuario, setor, ramal, patrimonio, equipamento_id,
                               categoria, prioridade, descricao, anexo, diagnostico, sla_limite)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now() + make_interval(mins => $12))
         RETURNING *`,
        [req.usuario.id, dados.nome_usuario, dados.setor, dados.ramal, dados.patrimonio, equipamentoId,
          categoria.id, prioridade.id, dados.descricao, req.file?.filename ?? null,
          diagnostico, prioridade.slaMinutos],
      );
      const novo = rows[0];
      await registrar(db, novo.id, req.usuario.id, 'Chamado aberto');
      await notificar(db, await idsEquipeTI(db), {
        chamadoId: novo.id,
        tipo: 'novo_chamado',
        mensagem: `Novo chamado ${numeroChamado(novo.id)} - ${categoria.nome} (${dados.setor}) aberto por ${dados.nome_usuario}.`,
        exceto: req.usuario.id,
      });
      return novo;
    });
    res.status(201).json(chamado);
  } catch (erro) {
    removerAnexo();
    throw erro;
  }
});

// Detalhe com histórico, equipamento e checklist da base de conhecimento
chamadosRouter.get('/:id', async (req, res) => {
  const chamado = await carregarChamado({ query }, req.params.id, req.usuario);
  const [historico, equipamento, base] = await Promise.all([
    query(
      `SELECT h.id, h.tipo, h.descricao, h.criado_em, u.nome AS usuario_nome, u.perfil AS usuario_perfil
         FROM historico h LEFT JOIN usuarios u ON u.id = h.usuario_id
        WHERE h.chamado_id = $1 ORDER BY h.criado_em, h.id`,
      [chamado.id],
    ),
    chamado.equipamento_id
      ? query(
        `SELECT e.*, u.nome AS usuario_nome FROM equipamentos e
           LEFT JOIN usuarios u ON u.id = e.usuario_id WHERE e.id = $1`,
        [chamado.equipamento_id],
      )
      : { rows: [] },
    ehEquipeTI(req.usuario)
      ? query('SELECT * FROM base_conhecimento WHERE categoria = $1 ORDER BY titulo', [chamado.categoria])
      : { rows: [] },
  ]);
  res.json({
    ...chamado,
    historico: historico.rows,
    equipamento: equipamento.rows[0] ?? null,
    base_conhecimento: base.rows,
  });
});

// Técnico assume o chamado
chamadosRouter.post('/:id/assumir', exigirEquipeTI, async (req, res) => {
  await transacao(async (db) => {
    const chamado = await carregarChamado(db, req.params.id, req.usuario, { bloquear: true });
    if (STATUS_FINALIZADOS.includes(chamado.status)) throw new HttpError(400, 'Este chamado já foi finalizado.');
    await db.query('UPDATE chamados SET tecnico_id = $2, atualizado_em = now() WHERE id = $1', [chamado.id, req.usuario.id]);
    await registrar(db, chamado.id, req.usuario.id, `Técnico ${req.usuario.nome} assumiu`);
    if (chamado.status === 'aberto') await aplicarStatus(db, chamado, 'em_atendimento', req.usuario);
    await notificar(db, [chamado.solicitante_id], {
      chamadoId: chamado.id,
      tipo: 'atualizado',
      mensagem: `Seu chamado ${numeroChamado(chamado.id)} está em atendimento com ${req.usuario.nome}.`,
      exceto: req.usuario.id,
    });
  });
  res.json({ ok: true });
});

// Técnico altera status, técnico responsável e/ou prioridade
chamadosRouter.patch('/:id', exigirEquipeTI, async (req, res) => {
  const { status, prioridade } = req.body ?? {};
  const tecnicoInformado = req.body?.tecnico_id !== undefined;
  const tecnicoId = req.body?.tecnico_id ? Number(req.body.tecnico_id) : null;

  await transacao(async (db) => {
    const chamado = await carregarChamado(db, req.params.id, req.usuario, { bloquear: true });
    const num = numeroChamado(chamado.id);

    if (tecnicoInformado && tecnicoId !== chamado.tecnico_id) {
      if (tecnicoId) {
        const t = await db.query(
          "SELECT id, nome FROM usuarios WHERE id = $1 AND perfil IN ('tecnico', 'admin') AND ativo",
          [tecnicoId],
        );
        if (!t.rows[0]) throw new HttpError(400, 'Técnico inválido.');
        await db.query('UPDATE chamados SET tecnico_id = $2, atualizado_em = now() WHERE id = $1', [chamado.id, t.rows[0].id]);
        await registrar(db, chamado.id, req.usuario.id,
          t.rows[0].id === req.usuario.id ? `Técnico ${t.rows[0].nome} assumiu` : `Chamado atribuído a ${t.rows[0].nome}`);
        await notificar(db, [t.rows[0].id], {
          chamadoId: chamado.id, tipo: 'atualizado',
          mensagem: `O chamado ${num} foi atribuído a você por ${req.usuario.nome}.`, exceto: req.usuario.id,
        });
      } else {
        await db.query('UPDATE chamados SET tecnico_id = NULL, atualizado_em = now() WHERE id = $1', [chamado.id]);
        await registrar(db, chamado.id, req.usuario.id, 'Chamado devolvido para a fila (sem técnico)');
      }
    }

    if (prioridade !== undefined && prioridade !== chamado.prioridade) {
      const p = prioridadePorId(prioridade);
      if (!p) throw new HttpError(400, 'Prioridade inválida.');
      await db.query(
        `UPDATE chamados SET prioridade = $2, sla_limite = criado_em + make_interval(mins => $3),
                sla_alertado = FALSE, atualizado_em = now() WHERE id = $1`,
        [chamado.id, p.id, p.slaMinutos],
      );
      await registrar(db, chamado.id, req.usuario.id,
        `Prioridade alterada: ${prioridadePorId(chamado.prioridade)?.nome} → ${p.nome}`);
    }

    if (status !== undefined && status !== chamado.status) {
      if (!STATUS.some((s) => s.id === status)) throw new HttpError(400, 'Status inválido.');
      await aplicarStatus(db, chamado, status, req.usuario);
      const resolvido = status === 'resolvido';
      await notificar(db, [chamado.solicitante_id], {
        chamadoId: chamado.id,
        tipo: resolvido ? 'resolvido' : 'atualizado',
        mensagem: resolvido
          ? `Seu chamado ${num} foi resolvido. Confirme a solução ou reabra se o problema continuar.`
          : `Seu chamado ${num} mudou para "${nomeStatus(status)}".`,
        exceto: req.usuario.id,
      });
    }
  });
  res.json({ ok: true });
});

// Comentário no chamado (técnico ou solicitante)
chamadosRouter.post('/:id/comentarios', async (req, res) => {
  const comentario = texto(req.body?.texto, 3000);
  if (!comentario) throw new HttpError(400, 'Escreva o comentário.');

  await transacao(async (db) => {
    const chamado = await carregarChamado(db, req.params.id, req.usuario, { bloquear: true });
    if (chamado.status === 'fechado') throw new HttpError(400, 'Chamado fechado não recebe comentários.');
    await registrar(db, chamado.id, req.usuario.id, comentario, 'comentario');
    await db.query('UPDATE chamados SET atualizado_em = now() WHERE id = $1', [chamado.id]);

    const doSolicitante = req.usuario.id === chamado.solicitante_id;
    // Se a TI estava aguardando o usuário e ele respondeu, o chamado volta para atendimento.
    if (doSolicitante && chamado.status === 'aguardando_usuario') {
      await aplicarStatus(db, chamado, 'em_atendimento', req.usuario);
    }
    const destino = doSolicitante
      ? (chamado.tecnico_id ? [chamado.tecnico_id] : await idsEquipeTI(db))
      : [chamado.solicitante_id];
    await notificar(db, destino, {
      chamadoId: chamado.id,
      tipo: 'atualizado',
      mensagem: `${req.usuario.nome} comentou no chamado ${numeroChamado(chamado.id)}.`,
      exceto: req.usuario.id,
    });
  });
  res.status(201).json({ ok: true });
});

// Solicitante confirma a solução (fecha) ou reabre um chamado resolvido
chamadosRouter.post('/:id/retorno', async (req, res) => {
  const acao = req.body?.acao;
  if (!['confirmar', 'reabrir'].includes(acao)) throw new HttpError(400, 'Ação inválida.');

  await transacao(async (db) => {
    const chamado = await carregarChamado(db, req.params.id, req.usuario, { bloquear: true });
    if (chamado.solicitante_id !== req.usuario.id && !ehEquipeTI(req.usuario)) {
      throw new HttpError(403, 'Apenas o solicitante pode fazer isso.');
    }
    if (chamado.status !== 'resolvido') throw new HttpError(400, 'Só é possível em chamados resolvidos.');

    const num = numeroChamado(chamado.id);
    if (acao === 'confirmar') {
      await aplicarStatus(db, chamado, 'fechado', req.usuario);
      await registrar(db, chamado.id, req.usuario.id, 'Solução confirmada pelo usuário. Chamado encerrado');
    } else {
      await aplicarStatus(db, chamado, chamado.tecnico_id ? 'em_atendimento' : 'aberto', req.usuario);
      const motivo = texto(req.body?.motivo, 1000);
      await registrar(db, chamado.id, req.usuario.id,
        `Chamado reaberto pelo usuário${motivo ? `: ${motivo}` : ''}`);
      await notificar(db, chamado.tecnico_id ? [chamado.tecnico_id] : await idsEquipeTI(db), {
        chamadoId: chamado.id, tipo: 'atualizado',
        mensagem: `O chamado ${num} (${nomeCategoria(chamado.categoria)}) foi reaberto por ${req.usuario.nome}.`,
        exceto: req.usuario.id,
      });
    }
  });
  res.json({ ok: true });
});
