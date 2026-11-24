import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { config } from './config.js';
import { HttpError, autenticar, exigirEquipeTI } from './auth.js';
import { authRouter } from './routes/auth.js';
import { chamadosRouter } from './routes/chamados.js';
import { indicadoresRouter } from './routes/indicadores.js';
import {
  baseRouter, catalogoRouter, equipamentosRouter, notificacoesRouter, usuariosRouter,
} from './routes/cadastros.js';
import { iniciarMonitorSla } from './sla.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// Anexos dos chamados (nomes aleatórios gerados no upload)
app.use('/uploads', express.static(config.uploadDir, { fallthrough: false }));

app.use('/api/auth', authRouter);
app.use('/api/catalogo', autenticar, catalogoRouter);
app.use('/api/chamados', autenticar, chamadosRouter);
app.use('/api/indicadores', autenticar, exigirEquipeTI, indicadoresRouter);
app.use('/api/equipamentos', autenticar, equipamentosRouter);
app.use('/api/base-conhecimento', autenticar, baseRouter);
app.use('/api/usuarios', autenticar, usuariosRouter);
app.use('/api/notificacoes', autenticar, notificacoesRouter);
app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

// Em produção, a própria API entrega o front-end compilado (frontend/dist)
if (fs.existsSync(config.frontendDist)) {
  app.use(express.static(config.frontendDist));
  app.get('/{*rota}', (req, res) => res.sendFile(path.join(config.frontendDist, 'index.html')));
}

// Tratamento central de erros
app.use((erro, req, res, next) => {
  if (erro instanceof HttpError) return res.status(erro.status).json({ erro: erro.message });
  if (erro instanceof multer.MulterError) {
    const mensagem = erro.code === 'LIMIT_FILE_SIZE' ? 'O anexo pode ter no máximo 5 MB.' : 'Erro no envio do anexo.';
    return res.status(400).json({ erro: mensagem });
  }
  if (erro.code === '23505') return res.status(409).json({ erro: 'Já existe um registro com esse valor (e-mail ou patrimônio).' });
  if (erro.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido.' });
  if (erro.status === 404) return res.status(404).end();
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
});

app.listen(config.port, () => {
  console.log(`Chamados TI rodando em http://localhost:${config.port}`);
  iniciarMonitorSla();
});
