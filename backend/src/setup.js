// Cria o banco (se não existir), as tabelas e os dados iniciais.
// Uso: npm run db:setup              -> estrutura + usuários e dados de demonstração
//      npm run db:setup -- --sem-demo -> estrutura + apenas o administrador
import fs from 'node:fs';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { PRIORIDADES } from './catalogo.js';

const semDemo = process.argv.includes('--sem-demo');

async function criarBancoSeNecessario() {
  const url = new URL(config.databaseUrl);
  const nomeBanco = decodeURIComponent(url.pathname.slice(1));
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(nomeBanco)) throw new Error(`Nome de banco inválido: ${nomeBanco}`);

  url.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: url.toString() });
  await admin.connect();
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [nomeBanco]);
    if (!rowCount) {
      await admin.query(`CREATE DATABASE "${nomeBanco}" ENCODING 'UTF8' TEMPLATE template0`);
      console.log(`Banco "${nomeBanco}" criado.`);
    }
  } finally {
    await admin.end();
  }
}

const USUARIOS = [
  { nome: 'Administrador TI', email: 'admin@empresa.local', senha: 'admin123', perfil: 'admin', setor: 'TI', ramal: '2000' },
  { nome: 'Ana Souza', email: 'ana.ti@empresa.local', senha: '123456', perfil: 'tecnico', setor: 'TI', ramal: '2001' },
  { nome: 'Pedro Lima', email: 'pedro.ti@empresa.local', senha: '123456', perfil: 'tecnico', setor: 'TI', ramal: '2002' },
  { nome: 'João Silva', email: 'joao@empresa.local', senha: '123456', perfil: 'usuario', setor: 'Financeiro', ramal: '2010' },
  { nome: 'Maria Santos', email: 'maria@empresa.local', senha: '123456', perfil: 'usuario', setor: 'Compras', ramal: '2020' },
  { nome: 'Carlos Oliveira', email: 'carlos@empresa.local', senha: '123456', perfil: 'usuario', setor: 'RH', ramal: '2030' },
  { nome: 'Fernanda Costa', email: 'fernanda@empresa.local', senha: '123456', perfil: 'usuario', setor: 'Comercial', ramal: '2040' },
];

const EQUIPAMENTOS = [
  ['FIN-PC01', 'joao@empresa.local', 'Financeiro', '192.168.1.21', '3C:52:82:1A:4F:10', 'PAT-1001', 'Windows 11 Pro', 'Office 2021', 'Windows Defender'],
  ['COMP-PC01', 'maria@empresa.local', 'Compras', '192.168.1.35', '3C:52:82:1A:4F:22', 'PAT-1002', 'Windows 11 Pro', 'Microsoft 365', 'Windows Defender'],
  ['RH-PC01', 'carlos@empresa.local', 'RH', '192.168.1.48', '3C:52:82:1A:4F:31', 'PAT-1003', 'Windows 10 Pro', 'Office 2019', 'Kaspersky'],
  ['COM-NB01', 'fernanda@empresa.local', 'Comercial', '192.168.1.62', '3C:52:82:1A:4F:47', 'PAT-1004', 'Windows 11 Pro', 'Microsoft 365', 'Windows Defender'],
  ['FIN-PC02', null, 'Financeiro', '192.168.1.22', '3C:52:82:1A:4F:11', 'PAT-1005', 'Windows 10 Pro', 'Office 2019', 'Windows Defender'],
];

const BASE_CONHECIMENTO = [
  ['impressora', 'Impressora não imprime', ['Verificar cabo', 'Reiniciar spool', 'Testar impressão']],
  ['internet', 'Estação sem internet', ['Verificar cabo', 'Testar ping', 'Reiniciar adaptador', 'Verificar DHCP']],
  ['email', 'E-mail não funciona', ['Outlook offline', 'Caixa cheia', 'Senha expirada', 'Servidor']],
  ['computador_nao_liga', 'Computador não liga', ['Verificar cabo de energia e tomada', 'Testar estabilizador', 'Verificar luz da fonte', 'Testar com outra fonte']],
  ['computador_lento', 'Computador lento', ['Verificar uso de CPU e memória', 'Verificar espaço em disco', 'Executar verificação do antivírus', 'Verificar atualizações pendentes']],
  ['senha', 'Redefinição de senha', ['Confirmar identidade do usuário', 'Desbloquear conta no AD', 'Gerar senha temporária', 'Exigir troca no próximo login']],
  ['sistema', 'Sistema indisponível', ['Verificar se o serviço está no ar', 'Testar acesso de outra estação', 'Verificar logs do servidor', 'Acionar fornecedor se necessário']],
  ['acesso_pasta', 'Acesso a pasta de rede', ['Confirmar aprovação do gestor', 'Verificar grupo do usuário no AD', 'Ajustar permissões da pasta', 'Remapear unidade de rede']],
];

// [email solicitante, categoria, prioridade, descrição, status, técnico, minutos atrás, minutos até resolver]
const CHAMADOS_DEMO = [
  ['joao@empresa.local', 'impressora', 'media', 'A impressora do financeiro não imprime nada, os documentos ficam parados na fila.', 'aberto', null, 40, null, 'PAT-1001'],
  ['maria@empresa.local', 'internet', 'alta', 'Estou sem internet desde que cheguei. O cabo está conectado.', 'aberto', null, 25, null, 'PAT-1002'],
  ['carlos@empresa.local', 'email', 'media', 'O Outlook não envia e-mails, ficam na caixa de saída.', 'aberto', null, 10, null, 'PAT-1003'],
  ['fernanda@empresa.local', 'computador_lento', 'baixa', 'O notebook está muito lento para abrir o sistema de vendas.', 'em_atendimento', 'ana.ti@empresa.local', 180, null, 'PAT-1004'],
  ['joao@empresa.local', 'sistema', 'alta', 'O sistema financeiro mostra erro de conexão ao gerar boletos.', 'aguardando_fornecedor', 'pedro.ti@empresa.local', 300, null, null],
  ['maria@empresa.local', 'senha', 'media', 'Preciso redefinir a senha do sistema de compras.', 'aguardando_usuario', 'ana.ti@empresa.local', 150, null, null],
  ['carlos@empresa.local', 'acesso_pasta', 'baixa', 'Preciso de acesso à pasta \\\\servidor\\RH\\Folha.', 'em_atendimento', 'pedro.ti@empresa.local', 90, null, null],
  ['fernanda@empresa.local', 'telefonia', 'media', 'Meu ramal não recebe ligações externas.', 'resolvido', 'ana.ti@empresa.local', 60 * 26, 95, null],
  ['joao@empresa.local', 'impressora', 'media', 'Impressora com papel atolado.', 'fechado', 'pedro.ti@empresa.local', 60 * 50, 40, 'PAT-1001'],
  ['maria@empresa.local', 'internet', 'critica', 'Setor de compras inteiro sem internet.', 'fechado', 'ana.ti@empresa.local', 60 * 72, 25, null],
  ['carlos@empresa.local', 'email', 'media', 'Caixa de correio cheia, não recebo e-mails.', 'fechado', 'ana.ti@empresa.local', 60 * 96, 120, 'PAT-1003'],
  ['fernanda@empresa.local', 'cameras', 'alta', 'Câmera da recepção sem imagem.', 'fechado', 'pedro.ti@empresa.local', 60 * 120, 150, null],
  ['joao@empresa.local', 'computador_nao_liga', 'alta', 'O computador não liga, nenhuma luz acende.', 'fechado', 'pedro.ti@empresa.local', 60 * 150, 180, 'PAT-1005'],
  ['maria@empresa.local', 'permissoes', 'baixa', 'Instalar o leitor de PDF no meu computador.', 'fechado', 'ana.ti@empresa.local', 60 * 170, 300, 'PAT-1002'],
  ['carlos@empresa.local', 'senha', 'media', 'Conta do Windows bloqueada.', 'fechado', 'ana.ti@empresa.local', 60 * 200, 15, null],
  ['fernanda@empresa.local', 'outros', 'baixa', 'Solicito um mouse novo, o atual está falhando.', 'fechado', 'pedro.ti@empresa.local', 60 * 240, 600, null],
  ['joao@empresa.local', 'email', 'media', 'Outlook pedindo senha toda hora.', 'fechado', 'pedro.ti@empresa.local', 60 * 300, 35, 'PAT-1001'],
  ['carlos@empresa.local', 'impressora', 'media', 'Impressora do RH imprimindo manchado.', 'fechado', 'ana.ti@empresa.local', 60 * 330, 520, null],
];

async function popular(db) {
  const { rows } = await db.query('SELECT count(*)::int AS total FROM usuarios');
  if (rows[0].total > 0) {
    console.log('O banco já possui usuários: dados iniciais não foram inseridos novamente.');
    return;
  }

  const ids = {};
  for (const u of semDemo ? USUARIOS.slice(0, 1) : USUARIOS) {
    const r = await db.query(
      `INSERT INTO usuarios (nome, email, senha_hash, perfil, setor, ramal)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [u.nome, u.email, await bcrypt.hash(u.senha, 10), u.perfil, u.setor, u.ramal],
    );
    ids[u.email] = { id: r.rows[0].id, ...u };
  }

  for (const [categoria, titulo, passos] of BASE_CONHECIMENTO) {
    await db.query('INSERT INTO base_conhecimento (categoria, titulo, passos) VALUES ($1, $2, $3)',
      [categoria, titulo, JSON.stringify(passos)]);
  }

  if (semDemo) return;

  const equipamentoPorPatrimonio = {};
  for (const [nome, email, setor, ip, mac, patrimonio, windows, office, antivirus] of EQUIPAMENTOS) {
    const r = await db.query(
      `INSERT INTO equipamentos (nome_computador, usuario_id, setor, ip, mac, patrimonio, windows, office, antivirus)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [nome, email ? ids[email].id : null, setor, ip, mac, patrimonio, windows, office, antivirus],
    );
    equipamentoPorPatrimonio[patrimonio] = r.rows[0].id;
  }

  const sla = Object.fromEntries(PRIORIDADES.map((p) => [p.id, p.slaMinutos]));
  for (const [email, categoria, prioridade, descricao, status, tecnicoEmail, atras, resolucao, patrimonio] of CHAMADOS_DEMO) {
    const sol = ids[email];
    const tec = tecnicoEmail ? ids[tecnicoEmail] : null;
    const finalizado = status === 'resolvido' || status === 'fechado';
    const { rows: [c] } = await db.query(
      `INSERT INTO chamados (solicitante_id, nome_usuario, setor, ramal, patrimonio, equipamento_id, categoria,
                             prioridade, descricao, status, tecnico_id, criado_em, atualizado_em, sla_limite,
                             sla_alertado, atendimento_inicio, resolvido_em, fechado_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::text, $11,
               now() - make_interval(mins => $12),
               now() - make_interval(mins => $12) + make_interval(mins => COALESCE($14, 2)),
               now() - make_interval(mins => $12) + make_interval(mins => $13),
               $15,
               CASE WHEN $11::int IS NULL THEN NULL ELSE now() - make_interval(mins => $12) + interval '2 minutes' END,
               CASE WHEN $14::int IS NULL THEN NULL ELSE now() - make_interval(mins => $12) + make_interval(mins => $14) END,
               CASE WHEN $10::text = 'fechado' THEN now() - make_interval(mins => $12) + make_interval(mins => $14 + 1) END)
       RETURNING id, criado_em`,
      [sol.id, sol.nome, sol.setor, sol.ramal, patrimonio, equipamentoPorPatrimonio[patrimonio] ?? null,
        categoria, prioridade, descricao, status, tec?.id ?? null, atras, sla[prioridade],
        finalizado ? resolucao : null, finalizado],
    );

    const evento = (minutos, usuarioId, texto, tipo = 'evento') => db.query(
      `INSERT INTO historico (chamado_id, usuario_id, tipo, descricao, criado_em)
       VALUES ($1, $2, $3, $4, $5::timestamptz + make_interval(mins => $6))`,
      [c.id, usuarioId, tipo, texto, c.criado_em, minutos],
    );
    await evento(0, sol.id, 'Chamado aberto');
    if (tec) {
      await evento(2, tec.id, `Técnico ${tec.nome} assumiu`);
      await evento(2, tec.id, 'Status alterado: Aberto → Em atendimento');
      if (status === 'aguardando_usuario') {
        await evento(10, tec.id, 'Pode confirmar qual sistema e se aparece alguma mensagem de erro?', 'comentario');
        await evento(10, tec.id, 'Status alterado: Em atendimento → Aguardando usuário');
      }
      if (status === 'aguardando_fornecedor') {
        await evento(30, tec.id, 'Erro no servidor do fornecedor. Chamado aberto junto ao suporte do sistema.', 'comentario');
        await evento(30, tec.id, 'Status alterado: Em atendimento → Aguardando fornecedor');
      }
    }
    if (finalizado) {
      await evento(resolucao, tec.id, 'Problema resolvido', 'comentario');
      await evento(resolucao, tec.id, 'Status alterado: Em atendimento → Resolvido');
      if (status === 'fechado') {
        await evento(resolucao + 1, sol.id, 'Solução confirmada pelo usuário. Chamado encerrado');
      }
    }
  }
}

async function main() {
  await criarBancoSeNecessario();
  const db = new pg.Client({ connectionString: config.databaseUrl, options: `-c timezone=${config.timezone}` });
  await db.connect();
  try {
    await db.query(fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
    console.log('Tabelas criadas/atualizadas.');
    await db.query('BEGIN');
    await popular(db);
    await db.query('COMMIT');
    console.log('Pronto! Acesse com admin@empresa.local / admin123');
  } catch (erro) {
    await db.query('ROLLBACK').catch(() => {});
    throw erro;
  } finally {
    await db.end();
  }
}

main().catch((erro) => {
  console.error('Falha ao preparar o banco:', erro.message);
  process.exit(1);
});
