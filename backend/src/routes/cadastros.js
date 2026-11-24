import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { HttpError, ehEquipeTI, exigirEquipeTI, exigirPerfil } from '../auth.js';
import { CATEGORIAS, PRIORIDADES, SETORES_PADRAO, STATUS, categoriaPorId } from '../catalogo.js';

const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const idValido = (v) => {
  const id = Number(v);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(404, 'Registro não encontrado.');
  return id;
};

/* ---------------------------------------------------------------- Catálogo */

export const catalogoRouter = Router();

catalogoRouter.get('/', async (req, res) => {
  const { rows } = await query(
    `SELECT DISTINCT setor FROM (
       SELECT setor FROM usuarios UNION SELECT setor FROM equipamentos UNION SELECT setor FROM chamados
     ) s WHERE setor IS NOT NULL AND setor <> ''`,
  );
  const setores = [...new Set([...SETORES_PADRAO, ...rows.map((r) => r.setor)])]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const tecnicos = ehEquipeTI(req.usuario)
    ? (await query("SELECT id, nome FROM usuarios WHERE perfil IN ('tecnico', 'admin') AND ativo ORDER BY nome")).rows
    : [];
  res.json({ categorias: CATEGORIAS, status: STATUS, prioridades: PRIORIDADES, setores, tecnicos });
});

/* ------------------------------------------------------------ Equipamentos */

export const equipamentosRouter = Router();

const CAMPOS_EQUIPAMENTO = {
  nome_computador: 80, setor: 80, ip: 45, mac: 17, patrimonio: 40, windows: 60, office: 60, antivirus: 60,
};

function dadosEquipamento(body = {}) {
  const dados = Object.fromEntries(
    Object.entries(CAMPOS_EQUIPAMENTO).map(([campo, max]) => [campo, texto(body[campo], max) || null]),
  );
  if (!dados.nome_computador || !dados.patrimonio) {
    throw new HttpError(400, 'Nome do computador e patrimônio são obrigatórios.');
  }
  dados.usuario_id = body.usuario_id ? Number(body.usuario_id) : null;
  if (dados.usuario_id !== null && !Number.isInteger(dados.usuario_id)) {
    throw new HttpError(400, 'Usuário inválido.');
  }
  return dados;
}

const SELECT_EQUIPAMENTO = `
  SELECT e.*, u.nome AS usuario_nome
    FROM equipamentos e LEFT JOIN usuarios u ON u.id = e.usuario_id`;

equipamentosRouter.get('/', async (req, res) => {
  const params = [];
  const where = [];
  if (!ehEquipeTI(req.usuario)) {
    params.push(req.usuario.id);
    where.push(`e.usuario_id = $${params.length}`);
  }
  if (req.query.busca) {
    params.push(`%${req.query.busca}%`);
    const i = params.length;
    where.push(`(e.nome_computador ILIKE $${i} OR e.patrimonio ILIKE $${i} OR e.ip ILIKE $${i}
                 OR e.setor ILIKE $${i} OR u.nome ILIKE $${i})`);
  }
  const { rows } = await query(
    `${SELECT_EQUIPAMENTO} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY e.nome_computador`,
    params,
  );
  res.json(rows);
});

// Usado na abertura do chamado para preencher os dados do computador pelo patrimônio
equipamentosRouter.get('/patrimonio/:patrimonio', async (req, res) => {
  const { rows } = await query(`${SELECT_EQUIPAMENTO} WHERE lower(e.patrimonio) = lower($1)`, [req.params.patrimonio]);
  if (!rows[0]) throw new HttpError(404, 'Nenhum equipamento com esse patrimônio.');
  res.json(rows[0]);
});

equipamentosRouter.post('/', exigirEquipeTI, async (req, res) => {
  const d = dadosEquipamento(req.body);
  const { rows } = await query(
    `INSERT INTO equipamentos (nome_computador, usuario_id, setor, ip, mac, patrimonio, windows, office, antivirus)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [d.nome_computador, d.usuario_id, d.setor, d.ip, d.mac, d.patrimonio, d.windows, d.office, d.antivirus],
  );
  res.status(201).json(rows[0]);
});

equipamentosRouter.put('/:id', exigirEquipeTI, async (req, res) => {
  const d = dadosEquipamento(req.body);
  const { rows } = await query(
    `UPDATE equipamentos SET nome_computador = $2, usuario_id = $3, setor = $4, ip = $5, mac = $6,
            patrimonio = $7, windows = $8, office = $9, antivirus = $10, atualizado_em = now()
      WHERE id = $1 RETURNING *`,
    [idValido(req.params.id), d.nome_computador, d.usuario_id, d.setor, d.ip, d.mac, d.patrimonio,
      d.windows, d.office, d.antivirus],
  );
  if (!rows[0]) throw new HttpError(404, 'Equipamento não encontrado.');
  res.json(rows[0]);
});

equipamentosRouter.delete('/:id', exigirEquipeTI, async (req, res) => {
  const { rowCount } = await query('DELETE FROM equipamentos WHERE id = $1', [idValido(req.params.id)]);
  if (!rowCount) throw new HttpError(404, 'Equipamento não encontrado.');
  res.status(204).end();
});

/* ------------------------------------------------------- Base de conhecimento */

export const baseRouter = Router();

function dadosArtigo(body = {}) {
  const categoria = texto(body.categoria, 40);
  const titulo = texto(body.titulo, 160);
  const passos = Array.isArray(body.passos)
    ? body.passos.map((p) => texto(p, 300)).filter(Boolean).slice(0, 50)
    : [];
  if (!categoriaPorId(categoria)) throw new HttpError(400, 'Categoria inválida.');
  if (!titulo) throw new HttpError(400, 'Informe o título.');
  if (passos.length === 0) throw new HttpError(400, 'Informe pelo menos um passo.');
  return { categoria, titulo, passos: JSON.stringify(passos) };
}

baseRouter.get('/', async (req, res) => {
  const { rows } = req.query.categoria
    ? await query('SELECT * FROM base_conhecimento WHERE categoria = $1 ORDER BY titulo', [req.query.categoria])
    : await query('SELECT * FROM base_conhecimento ORDER BY categoria, titulo');
  res.json(rows);
});

baseRouter.post('/', exigirEquipeTI, async (req, res) => {
  const d = dadosArtigo(req.body);
  const { rows } = await query(
    'INSERT INTO base_conhecimento (categoria, titulo, passos) VALUES ($1, $2, $3) RETURNING *',
    [d.categoria, d.titulo, d.passos],
  );
  res.status(201).json(rows[0]);
});

baseRouter.put('/:id', exigirEquipeTI, async (req, res) => {
  const d = dadosArtigo(req.body);
  const { rows } = await query(
    `UPDATE base_conhecimento SET categoria = $2, titulo = $3, passos = $4, atualizado_em = now()
      WHERE id = $1 RETURNING *`,
    [idValido(req.params.id), d.categoria, d.titulo, d.passos],
  );
  if (!rows[0]) throw new HttpError(404, 'Artigo não encontrado.');
  res.json(rows[0]);
});

baseRouter.delete('/:id', exigirEquipeTI, async (req, res) => {
  const { rowCount } = await query('DELETE FROM base_conhecimento WHERE id = $1', [idValido(req.params.id)]);
  if (!rowCount) throw new HttpError(404, 'Artigo não encontrado.');
  res.status(204).end();
});

/* ---------------------------------------------------------------- Usuários */

export const usuariosRouter = Router();

const PERFIS = ['usuario', 'tecnico', 'admin'];
const COLUNAS_USUARIO = 'id, nome, email, perfil, setor, ramal, ativo, criado_em';

function dadosUsuario(body = {}, { novo }) {
  const d = {
    nome: texto(body.nome, 120),
    email: texto(body.email, 160).toLowerCase(),
    perfil: body.perfil,
    setor: texto(body.setor, 80) || null,
    ramal: texto(body.ramal, 20) || null,
    ativo: body.ativo !== false,
    senha: typeof body.senha === 'string' ? body.senha : '',
  };
  if (!d.nome || !d.email) throw new HttpError(400, 'Nome e e-mail são obrigatórios.');
  if (!PERFIS.includes(d.perfil)) throw new HttpError(400, 'Perfil inválido.');
  if ((novo || d.senha) && d.senha.length < 6) throw new HttpError(400, 'A senha precisa ter pelo menos 6 caracteres.');
  return d;
}

// Lista simples (id e nome) usada no cadastro de equipamentos
usuariosRouter.get('/resumo', exigirEquipeTI, async (req, res) => {
  const { rows } = await query('SELECT id, nome, setor FROM usuarios WHERE ativo ORDER BY nome');
  res.json(rows);
});

usuariosRouter.get('/', exigirPerfil('admin'), async (req, res) => {
  const { rows } = await query(`SELECT ${COLUNAS_USUARIO} FROM usuarios ORDER BY nome`);
  res.json(rows);
});

usuariosRouter.post('/', exigirPerfil('admin'), async (req, res) => {
  const d = dadosUsuario(req.body, { novo: true });
  const { rows } = await query(
    `INSERT INTO usuarios (nome, email, senha_hash, perfil, setor, ramal, ativo)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${COLUNAS_USUARIO}`,
    [d.nome, d.email, await bcrypt.hash(d.senha, 10), d.perfil, d.setor, d.ramal, d.ativo],
  );
  res.status(201).json(rows[0]);
});

usuariosRouter.put('/:id', exigirPerfil('admin'), async (req, res) => {
  const id = idValido(req.params.id);
  const d = dadosUsuario(req.body, { novo: false });
  if (id === req.usuario.id && (d.perfil !== 'admin' || !d.ativo)) {
    throw new HttpError(400, 'Você não pode remover o seu próprio acesso de administrador.');
  }
  const { rows } = await query(
    `UPDATE usuarios SET nome = $2, email = $3, perfil = $4, setor = $5, ramal = $6, ativo = $7,
            senha_hash = COALESCE($8, senha_hash)
      WHERE id = $1 RETURNING ${COLUNAS_USUARIO}`,
    [id, d.nome, d.email, d.perfil, d.setor, d.ramal, d.ativo, d.senha ? await bcrypt.hash(d.senha, 10) : null],
  );
  if (!rows[0]) throw new HttpError(404, 'Usuário não encontrado.');
  res.json(rows[0]);
});

/* ------------------------------------------------------------ Notificações */

export const notificacoesRouter = Router();

notificacoesRouter.get('/', async (req, res) => {
  const [lista, total] = await Promise.all([
    query(
      'SELECT * FROM notificacoes WHERE usuario_id = $1 ORDER BY criado_em DESC, id DESC LIMIT 30',
      [req.usuario.id],
    ),
    query('SELECT count(*) AS nao_lidas FROM notificacoes WHERE usuario_id = $1 AND NOT lida', [req.usuario.id]),
  ]);
  res.json({ itens: lista.rows, nao_lidas: total.rows[0].nao_lidas });
});

notificacoesRouter.post('/lidas', async (req, res) => {
  await query('UPDATE notificacoes SET lida = TRUE WHERE usuario_id = $1 AND NOT lida', [req.usuario.id]);
  res.json({ ok: true });
});

notificacoesRouter.post('/:id/lida', async (req, res) => {
  await query('UPDATE notificacoes SET lida = TRUE WHERE id = $1 AND usuario_id = $2', [idValido(req.params.id), req.usuario.id]);
  res.json({ ok: true });
});
