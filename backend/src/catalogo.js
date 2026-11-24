// Catálogo fixo do sistema: categorias (com o roteiro do Assistente Inteligente),
// status, prioridades e SLA.

const SIM_NAO = ['Sim', 'Não'];

/**
 * Cada categoria tem um assistente opcional:
 *  - perguntas: [{ id, texto, opcoes }]
 *  - regras: avaliadas em ordem; vale a primeira cujas condições ("se") batem com as respostas.
 *      solucao     -> texto mostrado ao usuário como "tente isto antes de abrir o chamado"
 *      diagnostico -> diagnóstico inicial gravado no chamado para o técnico
 *      prioridade  -> prioridade sugerida
 *    Uma regra sem "se" funciona como padrão.
 */
export const CATEGORIAS = [
  {
    id: 'impressora',
    nome: 'Impressora',
    icone: '🖨️',
    assistente: {
      perguntas: [
        { id: 'ligada', texto: 'A impressora está ligada e sem mensagem de erro no visor?', opcoes: SIM_NAO },
        { id: 'papel', texto: 'Tem papel na bandeja?', opcoes: SIM_NAO },
        { id: 'outros', texto: 'Outras pessoas conseguem imprimir nela?', opcoes: SIM_NAO },
      ],
      regras: [
        {
          se: { ligada: 'Não' },
          solucao: 'Ligue a impressora e confira o visor: feche portas abertas e retire papel atolado. Aguarde aparecer "Pronta" e tente imprimir de novo.',
          diagnostico: 'Impressora desligada ou com erro no visor.',
        },
        {
          se: { papel: 'Não' },
          solucao: 'Coloque papel na bandeja e mande imprimir novamente.',
          diagnostico: 'Impressora sem papel.',
        },
        {
          se: { outros: 'Não' },
          diagnostico: 'Ninguém consegue imprimir: possível falha na fila de impressão (spool) ou na rede da impressora.',
          prioridade: 'alta',
        },
        {
          solucao: 'Reinicie o seu computador e tente imprimir novamente.',
          diagnostico: 'Falha só nesta estação: verificar driver e fila de impressão local.',
          prioridade: 'media',
        },
      ],
    },
  },
  {
    id: 'internet',
    nome: 'Sem internet',
    icone: '🌐',
    assistente: {
      perguntas: [
        { id: 'cabo', texto: 'O cabo de rede está conectado?', opcoes: SIM_NAO },
        { id: 'wifi', texto: 'O Wi-Fi aparece disponível?', opcoes: SIM_NAO },
        { id: 'colegas', texto: 'Outros colegas estão com internet?', opcoes: SIM_NAO },
      ],
      regras: [
        {
          se: { colegas: 'Não' },
          diagnostico: 'Vários usuários sem internet: possível queda do link ou falha no switch/roteador do setor.',
          prioridade: 'critica',
        },
        {
          se: { cabo: 'Não', wifi: 'Sim' },
          solucao: 'Conecte o cabo de rede ou entre na rede Wi-Fi da empresa pelo ícone de rede, perto do relógio.',
          diagnostico: 'Estação sem cabo de rede conectado.',
        },
        {
          se: { cabo: 'Não' },
          solucao: 'Conecte o cabo de rede firmemente no computador e na tomada de rede. Aguarde 30 segundos e teste de novo.',
          diagnostico: 'Estação sem cabo de rede e sem Wi-Fi disponível.',
        },
        {
          solucao: 'Reinicie o computador. Se continuar sem internet, abra o chamado.',
          diagnostico: 'Cabo conectado e colegas com internet: problema isolado na estação (verificar adaptador de rede e DHCP).',
          prioridade: 'alta',
        },
      ],
    },
  },
  {
    id: 'computador_nao_liga',
    nome: 'Computador não liga',
    icone: '💻',
    assistente: {
      perguntas: [
        { id: 'cabo', texto: 'O cabo de energia está bem conectado na tomada e no computador?', opcoes: SIM_NAO },
        { id: 'estabilizador', texto: 'O estabilizador ou filtro de linha está ligado?', opcoes: SIM_NAO },
        { id: 'luz', texto: 'Alguma luz acende no computador quando aperta o botão de ligar?', opcoes: SIM_NAO },
      ],
      regras: [
        {
          se: { cabo: 'Não' },
          solucao: 'Encaixe bem o cabo de energia no computador e na tomada e tente ligar novamente.',
          diagnostico: 'Cabo de energia solto.',
        },
        {
          se: { estabilizador: 'Não' },
          solucao: 'Ligue o estabilizador/filtro de linha, aguarde alguns segundos e ligue o computador.',
          diagnostico: 'Estabilizador desligado.',
        },
        {
          se: { luz: 'Sim' },
          solucao: 'Confira se o monitor está ligado e se o cabo de vídeo está encaixado nos dois lados.',
          diagnostico: 'Computador recebe energia mas não dá imagem: verificar monitor, cabo de vídeo e memória.',
          prioridade: 'alta',
        },
        {
          diagnostico: 'Sem sinal de energia com cabo e estabilizador ok: possível fonte com defeito.',
          prioridade: 'alta',
        },
      ],
    },
  },
  {
    id: 'email',
    nome: 'E-mail não funciona',
    icone: '📧',
    assistente: {
      perguntas: [
        { id: 'offline', texto: 'O Outlook mostra "Desconectado" ou "Trabalhando offline" na barra inferior?', opcoes: SIM_NAO },
        { id: 'cheia', texto: 'Aparece aviso de caixa de correio cheia?', opcoes: SIM_NAO },
        { id: 'senha', texto: 'Sua senha foi trocada recentemente ou o Outlook está pedindo senha?', opcoes: SIM_NAO },
      ],
      regras: [
        {
          se: { offline: 'Sim' },
          solucao: 'No Outlook, abra a guia "Enviar/Receber" e clique em "Trabalhar Offline" para desativar. Se continuar desconectado, feche e abra o Outlook.',
          diagnostico: 'Outlook offline.',
        },
        {
          se: { cheia: 'Sim' },
          solucao: 'Esvazie a pasta "Itens Excluídos" e apague e-mails com anexos grandes que não usa mais. Depois tente enviar de novo.',
          diagnostico: 'Caixa de correio cheia.',
        },
        {
          se: { senha: 'Sim' },
          solucao: 'Feche o Outlook, abra novamente e informe a senha atual da rede quando ele pedir.',
          diagnostico: 'Senha expirada ou alterada.',
        },
        {
          diagnostico: 'Outlook online, caixa e senha ok: verificar servidor de e-mail.',
          prioridade: 'alta',
        },
      ],
    },
  },
  {
    id: 'sistema',
    nome: 'Sistema indisponível',
    icone: '🗄️',
    assistente: {
      perguntas: [
        { id: 'colegas', texto: 'Outros colegas também não conseguem acessar o sistema?', opcoes: SIM_NAO },
        { id: 'reabriu', texto: 'Você já fechou e abriu o sistema novamente?', opcoes: SIM_NAO },
        { id: 'erro', texto: 'Aparece alguma mensagem de erro?', opcoes: SIM_NAO },
      ],
      regras: [
        {
          se: { colegas: 'Sim' },
          diagnostico: 'Sistema fora do ar para vários usuários.',
          prioridade: 'critica',
        },
        {
          se: { reabriu: 'Não' },
          solucao: 'Feche o sistema por completo (inclusive o navegador, se for web) e abra novamente.',
          diagnostico: 'Falha isolada no acesso ao sistema.',
        },
        {
          se: { erro: 'Sim' },
          diagnostico: 'Falha isolada com mensagem de erro. Peça ao usuário um print da mensagem.',
          prioridade: 'media',
        },
        { diagnostico: 'Falha isolada no acesso ao sistema, sem mensagem de erro.', prioridade: 'media' },
      ],
    },
  },
  {
    id: 'senha',
    nome: 'Senha',
    icone: '🔑',
    assistente: {
      perguntas: [
        { id: 'qual', texto: 'Qual senha?', opcoes: ['Windows/Rede', 'E-mail', 'Sistema interno', 'Outra'] },
        { id: 'capslock', texto: 'A tecla Caps Lock está desligada?', opcoes: SIM_NAO },
        { id: 'bloqueada', texto: 'Aparece a mensagem de conta bloqueada?', opcoes: SIM_NAO },
      ],
      regras: [
        {
          se: { capslock: 'Não' },
          solucao: 'Desligue o Caps Lock (a luz do teclado deve apagar) e digite a senha novamente.',
          diagnostico: 'Caps Lock ativado.',
        },
        {
          se: { bloqueada: 'Sim' },
          diagnostico: 'Conta bloqueada por tentativas: desbloquear e redefinir a senha.',
          prioridade: 'alta',
        },
        { diagnostico: 'Solicitação de redefinição de senha.', prioridade: 'media' },
      ],
    },
  },
  {
    id: 'computador_lento',
    nome: 'Computador lento',
    icone: '🖥️',
    assistente: {
      perguntas: [
        { id: 'reiniciou', texto: 'Você reiniciou o computador hoje?', opcoes: SIM_NAO },
        { id: 'programas', texto: 'Tem muitos programas ou abas do navegador abertos?', opcoes: SIM_NAO },
        { id: 'especifico', texto: 'A lentidão é só em um programa específico?', opcoes: SIM_NAO },
      ],
      regras: [
        {
          se: { reiniciou: 'Não' },
          solucao: 'Salve seus arquivos e reinicie o computador. Isso resolve a maioria dos casos de lentidão.',
          diagnostico: 'Computador sem reiniciar há bastante tempo.',
        },
        {
          se: { programas: 'Sim' },
          solucao: 'Feche os programas e abas que não está usando e veja se melhora.',
          diagnostico: 'Muitos programas abertos ao mesmo tempo.',
        },
        {
          se: { especifico: 'Sim' },
          diagnostico: 'Lentidão em um programa específico: verificar atualização/reinstalação.',
          prioridade: 'baixa',
        },
        { diagnostico: 'Lentidão geral: verificar disco, memória e antivírus.', prioridade: 'media' },
      ],
    },
  },
  {
    id: 'acesso_pasta',
    nome: 'Acesso a pasta',
    icone: '📁',
    assistente: {
      perguntas: [
        { id: 'tinha', texto: 'Você já tinha acesso a essa pasta antes?', opcoes: SIM_NAO },
        { id: 'negado', texto: 'Aparece a mensagem "Acesso negado"?', opcoes: SIM_NAO },
      ],
      regras: [
        {
          se: { tinha: 'Não' },
          diagnostico: 'Pedido de novo acesso: confirmar autorização do gestor do setor.',
          prioridade: 'baixa',
        },
        {
          se: { negado: 'Sim' },
          diagnostico: 'Acesso que existia foi removido ou alterado: revisar permissões da pasta.',
          prioridade: 'media',
        },
        {
          solucao: 'Reinicie o computador para a unidade de rede ser conectada novamente.',
          diagnostico: 'Unidade de rede possivelmente desconectada.',
        },
      ],
    },
  },
  {
    id: 'permissoes',
    nome: 'Permissões',
    icone: '🔒',
    assistente: {
      perguntas: [
        { id: 'instalar', texto: 'É para instalar um programa?', opcoes: SIM_NAO },
        { id: 'gestor', texto: 'Seu gestor já aprovou o pedido?', opcoes: SIM_NAO },
      ],
      regras: [
        {
          se: { gestor: 'Não' },
          diagnostico: 'Pedido de permissão ainda sem aprovação do gestor: solicitar aprovação antes de executar.',
          prioridade: 'baixa',
        },
        {
          se: { instalar: 'Sim' },
          diagnostico: 'Instalação de programa aprovada pelo gestor: verificar licença.',
          prioridade: 'media',
        },
        { diagnostico: 'Pedido de permissão aprovado pelo gestor.', prioridade: 'media' },
      ],
    },
  },
  {
    id: 'telefonia',
    nome: 'Telefonia',
    icone: '📞',
    assistente: {
      perguntas: [
        { id: 'visor', texto: 'O telefone está com o visor aceso?', opcoes: SIM_NAO },
        { id: 'tipo', texto: 'O problema é para fazer ou receber ligações?', opcoes: ['Fazer', 'Receber', 'Ambos'] },
        { id: 'outros', texto: 'Outros ramais do setor estão funcionando?', opcoes: SIM_NAO },
      ],
      regras: [
        {
          se: { outros: 'Não' },
          diagnostico: 'Vários ramais sem funcionar: possível falha geral na central telefônica.',
          prioridade: 'critica',
        },
        {
          se: { visor: 'Não' },
          solucao: 'Confira se o cabo do telefone está bem encaixado no aparelho e na tomada de rede/telefone.',
          diagnostico: 'Aparelho sem energia ou cabo solto.',
        },
        { diagnostico: 'Falha em um ramal específico.', prioridade: 'media' },
      ],
    },
  },
  {
    id: 'cameras',
    nome: 'Câmeras',
    icone: '📹',
    assistente: {
      perguntas: [
        { id: 'quantas', texto: 'Quantas câmeras estão com problema?', opcoes: ['Uma', 'Várias ou todas'] },
        { id: 'imagem', texto: 'Como está a imagem?', opcoes: ['Preta', 'Travada', 'Com chuvisco'] },
      ],
      regras: [
        {
          se: { quantas: 'Várias ou todas' },
          diagnostico: 'Várias câmeras com falha: possível problema no gravador (DVR/NVR) ou na alimentação.',
          prioridade: 'alta',
        },
        { diagnostico: 'Falha em uma câmera específica: verificar cabo e fonte.', prioridade: 'media' },
      ],
    },
  },
  {
    id: 'outros',
    nome: 'Outros',
    icone: '❓',
    assistente: null,
  },
];

export const STATUS = [
  { id: 'aberto', nome: 'Aberto' },
  { id: 'em_atendimento', nome: 'Em atendimento' },
  { id: 'aguardando_usuario', nome: 'Aguardando usuário' },
  { id: 'aguardando_fornecedor', nome: 'Aguardando fornecedor' },
  { id: 'resolvido', nome: 'Resolvido' },
  { id: 'fechado', nome: 'Fechado' },
];

// Tempo de SLA de cada prioridade, em minutos.
export const PRIORIDADES = [
  { id: 'baixa', nome: 'Baixa', slaMinutos: 24 * 60 },
  { id: 'media', nome: 'Média', slaMinutos: 8 * 60 },
  { id: 'alta', nome: 'Alta', slaMinutos: 2 * 60 },
  { id: 'critica', nome: 'Crítica', slaMinutos: 30 },
];

export const SETORES_PADRAO = [
  'Administrativo', 'Comercial', 'Compras', 'Diretoria', 'Financeiro',
  'Logística', 'Produção', 'RH', 'TI',
];

export const STATUS_FINALIZADOS = ['resolvido', 'fechado'];

export const categoriaPorId = (id) => CATEGORIAS.find((c) => c.id === id);
export const prioridadePorId = (id) => PRIORIDADES.find((p) => p.id === id);
export const nomeStatus = (id) => STATUS.find((s) => s.id === id)?.nome ?? id;
export const nomeCategoria = (id) => categoriaPorId(id)?.nome ?? id;
export const numeroChamado = (id) => `#${String(id).padStart(3, '0')}`;

/**
 * Avalia as respostas do Assistente Inteligente e devolve o diagnóstico inicial,
 * a solução sugerida (se houver) e a prioridade recomendada.
 * respostas: { [perguntaId]: opcaoEscolhida }
 */
export function avaliarAssistente(categoriaId, respostas = {}) {
  const assistente = categoriaPorId(categoriaId)?.assistente;
  if (!assistente || typeof respostas !== 'object' || respostas === null) return null;

  const respondidas = assistente.perguntas
    .filter((p) => p.opcoes.includes(respostas[p.id]))
    .map((p) => ({ pergunta: p.texto, resposta: respostas[p.id] }));
  if (respondidas.length === 0) return null;

  const regra = assistente.regras.find((r) =>
    Object.entries(r.se ?? {}).every(([pergunta, valor]) => respostas[pergunta] === valor),
  );

  return {
    respostas: respondidas,
    diagnostico: regra?.diagnostico ?? null,
    solucao: regra?.solucao ?? null,
    prioridade: regra?.prioridade ?? null,
  };
}
