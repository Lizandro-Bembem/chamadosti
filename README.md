# Chamados TI

Help Desk interno para a equipe de TI: abertura de chamados com **assistente inteligente**, acompanhamento do atendimento, SLA, base de conhecimento, cadastro de equipamentos, dashboard e notificações.

**Paleta:** principal `#075930` · branco `#FEFEFD` · laranja `#FE7C00`

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Front-end | React 19 + Tailwind CSS 4 (Vite) + Recharts |
| Back-end | Node.js (Express 5) |
| Banco de dados | PostgreSQL |
| Autenticação | Login próprio (JWT) com perfis Usuário, Técnico e Administrador |

## Como rodar

Pré-requisitos: **Node.js 20+** e **PostgreSQL** (já instalados nesta máquina).

```bash
# 1. Instalar as dependências (raiz, backend e frontend)
npm run instalar

# 2. Configurar a conexão com o banco
#    copie backend/.env.example para backend/.env e troque SENHA pela senha do usuário postgres
#    (troque também o JWT_SECRET por um texto longo e aleatório)

# 3. Criar o banco "chamados_ti", as tabelas e os dados de exemplo
npm run db:setup
#    para criar só o administrador, sem dados de demonstração:
#    npm run db:setup --prefix backend -- --sem-demo

# 4. Rodar em modo desenvolvimento (API na porta 3333 + tela na 5173)
npm run dev
```

Abra **http://localhost:5173**.

### Produção (um único servidor)

```bash
npm run build   # compila o front-end em frontend/dist
npm start       # a API passa a servir o sistema em http://localhost:3333
```

## Acessos de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | admin@empresa.local | admin123 |
| Técnico | ana.ti@empresa.local | 123456 |
| Técnico | pedro.ti@empresa.local | 123456 |
| Usuário | joao@empresa.local | 123456 |
| Usuário | maria@empresa.local | 123456 |

> Troque essas senhas (menu do usuário → *Trocar senha*) ou rode o setup com `--sem-demo` antes de usar de verdade.

## Funcionalidades

1. **Abertura de chamados**: o usuário escolhe o problema (Impressora, Sem internet, Computador não liga, E-mail, Sistema indisponível, Senha, Computador lento, Acesso a pasta, Permissões, Telefonia, Câmeras, Outros). Campos: nome, setor, ramal, patrimônio, categoria, prioridade, descrição e imagem anexa.
2. **Assistente inteligente**: antes de abrir, o usuário responde perguntas rápidas. O sistema sugere uma solução imediata ("Resolveu? Então não precisa de chamado") ou abre o chamado já com diagnóstico inicial e prioridade sugerida. As perguntas e regras ficam em `backend/src/catalogo.js`.
3. **Status**: Aberto, Em atendimento, Aguardando usuário, Aguardando fornecedor, Resolvido e Fechado. O usuário confirma a solução (fecha) ou reabre o chamado.
4. **Painel do técnico**: abertos, em atendimento, resolvidos hoje, pendentes e SLA vencido, além de "Meus chamados", "Fila sem técnico" (com botão *Assumir*) e chamados com SLA em risco.
5. **Filtros**: nome, setor, categoria, técnico, data, status, prioridade e busca livre.
6. **Histórico**: linha do tempo com horário de cada evento (abertura, técnico que assumiu, mudanças de status, comentários).
7. **Base de conhecimento**: checklists por categoria. Aparecem no chamado para o técnico ir marcando.
8. **Dashboard**: chamados por categoria, por técnico, por setor e do mês (por dia), tempo médio de atendimento e % de SLA cumprido. Cada gráfico tem a opção *Ver tabela*.
9. **SLA**: Baixa 24h · Média 8h · Alta 2h · Crítica 30 min. Mudar a prioridade recalcula o prazo.
10. **Cadastro de equipamentos**: nome do computador, usuário, setor, IP, MAC, patrimônio, Windows, Office e antivírus. Ao informar o patrimônio no chamado, os dados aparecem automaticamente.
11. **Notificações** (sino no topo, atualizado a cada 30 s, com aviso do navegador quando a aba está em segundo plano): novo chamado, chamado atualizado, chamado resolvido e SLA próximo do vencimento (75% do prazo consumido).

## Estrutura

```
backend/
  src/server.js          API Express (e entrega do front-end compilado)
  src/catalogo.js        categorias, perguntas do assistente, status, prioridades e SLA
  src/schema.sql         tabelas do PostgreSQL
  src/setup.js           cria banco, tabelas e dados iniciais
  src/sla.js             monitor de SLA (a cada minuto)
  src/routes/            chamados, indicadores, cadastros, autenticação
  uploads/               imagens anexadas aos chamados
frontend/
  src/pages/             telas (Login, Chamados, NovoChamado, ChamadoDetalhe, Painel, Dashboard, ...)
  src/components/        layout, notificações e componentes visuais
  src/index.css          tema com a paleta de cores
```

## Próximos passos sugeridos

- Login integrado ao Active Directory/LDAP.
- Envio de e-mails e integração com Microsoft Teams nas notificações.
- Acesso remoto (AnyDesk/Quick Assist) a partir do chamado.
- Relatórios em PDF/Excel.
