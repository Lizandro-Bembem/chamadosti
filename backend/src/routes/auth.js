import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { HttpError, autenticar, gerarToken } from '../auth.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const senha = String(req.body?.senha ?? '');
  if (!email || !senha) throw new HttpError(400, 'Informe e-mail e senha.');

  const { rows } = await query('SELECT * FROM usuarios WHERE lower(email) = $1', [email]);
  const usuario = rows[0];
  if (!usuario || !(await bcrypt.compare(senha, usuario.senha_hash))) {
    throw new HttpError(401, 'E-mail ou senha inválidos.');
  }
  if (!usuario.ativo) throw new HttpError(403, 'Usuário desativado. Procure a equipe de TI.');

  const { senha_hash: _, ...dados } = usuario;
  res.json({ token: gerarToken(usuario), usuario: dados });
});

authRouter.get('/me', autenticar, (req, res) => res.json(req.usuario));

authRouter.post('/trocar-senha', autenticar, async (req, res) => {
  const { atual, nova } = req.body ?? {};
  if (!nova || String(nova).length < 6) throw new HttpError(400, 'A nova senha precisa ter pelo menos 6 caracteres.');
  const { rows } = await query('SELECT senha_hash FROM usuarios WHERE id = $1', [req.usuario.id]);
  if (!(await bcrypt.compare(String(atual ?? ''), rows[0].senha_hash))) {
    throw new HttpError(400, 'Senha atual incorreta.');
  }
  await query('UPDATE usuarios SET senha_hash = $2 WHERE id = $1', [req.usuario.id, await bcrypt.hash(String(nova), 10)]);
  res.json({ ok: true });
});
