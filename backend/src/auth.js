import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { query } from './db.js';

export class HttpError extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

export const ehEquipeTI = (usuario) => usuario.perfil === 'tecnico' || usuario.perfil === 'admin';

export function gerarToken(usuario) {
  return jwt.sign({ id: usuario.id }, config.jwtSecret, { expiresIn: '12h' });
}

export async function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
  if (!token) return res.status(401).json({ erro: 'Faça login para continuar.' });

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
  }

  const { rows } = await query(
    'SELECT id, nome, email, perfil, setor, ramal, ativo FROM usuarios WHERE id = $1',
    [payload.id],
  );
  if (!rows[0] || !rows[0].ativo) {
    return res.status(401).json({ erro: 'Usuário inativo ou inexistente.' });
  }
  req.usuario = rows[0];
  next();
}

export const exigirPerfil = (...perfis) => (req, res, next) => {
  if (!perfis.includes(req.usuario.perfil)) {
    return res.status(403).json({ erro: 'Você não tem permissão para esta ação.' });
  }
  next();
};

export const exigirEquipeTI = exigirPerfil('tecnico', 'admin');
