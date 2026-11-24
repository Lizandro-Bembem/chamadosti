-- Estrutura do banco do sistema Chamados TI

CREATE TABLE IF NOT EXISTS usuarios (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(120) NOT NULL,
  email       VARCHAR(160) NOT NULL UNIQUE,
  senha_hash  VARCHAR(100) NOT NULL,
  perfil      VARCHAR(20)  NOT NULL DEFAULT 'usuario'
              CHECK (perfil IN ('usuario', 'tecnico', 'admin')),
  setor       VARCHAR(80),
  ramal       VARCHAR(20),
  ativo       BOOLEAN      NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS equipamentos (
  id               SERIAL PRIMARY KEY,
  nome_computador  VARCHAR(80)  NOT NULL,
  usuario_id       INT REFERENCES usuarios(id) ON DELETE SET NULL,
  setor            VARCHAR(80),
  ip               VARCHAR(45),
  mac              VARCHAR(17),
  patrimonio       VARCHAR(40)  NOT NULL UNIQUE,
  windows          VARCHAR(60),
  office           VARCHAR(60),
  antivirus        VARCHAR(60),
  criado_em        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  atualizado_em    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chamados (
  id                  SERIAL PRIMARY KEY,
  solicitante_id      INT NOT NULL REFERENCES usuarios(id),
  nome_usuario        VARCHAR(120) NOT NULL,
  setor               VARCHAR(80)  NOT NULL,
  ramal               VARCHAR(20),
  patrimonio          VARCHAR(40),
  equipamento_id      INT REFERENCES equipamentos(id) ON DELETE SET NULL,
  categoria           VARCHAR(40)  NOT NULL,
  prioridade          VARCHAR(10)  NOT NULL
                      CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')),
  descricao           TEXT         NOT NULL,
  anexo               VARCHAR(200),
  diagnostico         JSONB,
  status              VARCHAR(30)  NOT NULL DEFAULT 'aberto'
                      CHECK (status IN ('aberto', 'em_atendimento', 'aguardando_usuario',
                                        'aguardando_fornecedor', 'resolvido', 'fechado')),
  tecnico_id          INT REFERENCES usuarios(id) ON DELETE SET NULL,
  sla_limite          TIMESTAMPTZ  NOT NULL,
  sla_alertado        BOOLEAN      NOT NULL DEFAULT FALSE,
  criado_em           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  atualizado_em       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  atendimento_inicio  TIMESTAMPTZ,
  resolvido_em        TIMESTAMPTZ,
  fechado_em          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chamados_status     ON chamados (status);
CREATE INDEX IF NOT EXISTS idx_chamados_tecnico    ON chamados (tecnico_id);
CREATE INDEX IF NOT EXISTS idx_chamados_criado_em  ON chamados (criado_em);
CREATE INDEX IF NOT EXISTS idx_chamados_solicitante ON chamados (solicitante_id);

CREATE TABLE IF NOT EXISTS historico (
  id          SERIAL PRIMARY KEY,
  chamado_id  INT NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  usuario_id  INT REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo        VARCHAR(20) NOT NULL DEFAULT 'evento' CHECK (tipo IN ('evento', 'comentario')),
  descricao   TEXT        NOT NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historico_chamado ON historico (chamado_id);

CREATE TABLE IF NOT EXISTS notificacoes (
  id          SERIAL PRIMARY KEY,
  usuario_id  INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  chamado_id  INT REFERENCES chamados(id) ON DELETE CASCADE,
  tipo        VARCHAR(30) NOT NULL,
  mensagem    TEXT        NOT NULL,
  lida        BOOLEAN     NOT NULL DEFAULT FALSE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes (usuario_id, lida);

CREATE TABLE IF NOT EXISTS base_conhecimento (
  id             SERIAL PRIMARY KEY,
  categoria      VARCHAR(40)  NOT NULL,
  titulo         VARCHAR(160) NOT NULL,
  passos         JSONB        NOT NULL DEFAULT '[]',
  atualizado_em  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
