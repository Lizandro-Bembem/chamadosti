import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../contexto.jsx';
import { Carregando, Erro, PrioridadeBadge, SlaBadge, StatusBadge, Vazio } from '../components/ui.jsx';
import { dataHora, finalizado, hora, data as soData, numero } from '../util.js';
import { CheckAnimado } from '../components/animacao.jsx';

function Bloco({ titulo, children, acao }) {
  return (
    <section className="cartao overflow-hidden">
      <div className="flex items-center justify-between border-b border-borda px-5 py-3">
        <h2 className="text-sm font-bold tracking-wide text-primaria uppercase">{titulo}</h2>
        {acao}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Dados({ itens }) {
  return (
    <dl className="space-y-2.5 text-sm">
      {itens.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4">
          <dt className="text-texto-suave">{k}</dt>
          <dd className="text-right font-medium break-all">{v || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function Historico({ itens }) {
  let diaAnterior = '';
  return (
    <ol className="relative space-y-4 border-l-2 border-primaria-clara pl-5">
      {itens.map((h, indice) => {
        const dia = soData(h.criado_em);
        const mostrarDia = dia !== diaAnterior;
        diaAnterior = dia;
        const comentario = h.tipo === 'comentario';
        return (
          <li key={h.id} className="escalonado relative" style={{ '--i': indice }}>
            <span className={`absolute top-1.5 -left-[27px] size-3 rounded-full ring-4 ring-fundo ${comentario ? 'bg-destaque' : 'bg-primaria'}`} />
            {mostrarDia && <p className="mb-1 text-xs font-semibold text-texto-suave">{dia}</p>}
            <p className="font-mono text-sm font-bold text-primaria">{hora(h.criado_em)}</p>
            {comentario ? (
              <div className="mt-1 rounded-lg rounded-tl-none bg-superficie px-3 py-2 text-sm">
                <p className="mb-0.5 text-xs font-semibold text-texto-suave">💬 {h.usuario_nome}</p>
                <p className="whitespace-pre-wrap">{h.descricao}</p>
              </div>
            ) : (
              <p className="text-sm">{h.descricao}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function AcoesTecnico({ chamado, onAtualizado }) {
  const { usuario, catalogo } = useApp();
  const [form, setForm] = useState({ status: chamado.status, tecnico_id: chamado.tecnico_id ?? '', prioridade: chamado.prioridade });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setForm({ status: chamado.status, tecnico_id: chamado.tecnico_id ?? '', prioridade: chamado.prioridade });
  }, [chamado.status, chamado.tecnico_id, chamado.prioridade]);

  const executar = async (fn) => {
    setErro('');
    setSalvando(true);
    try {
      await fn();
      await onAtualizado();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  };

  const salvar = (e) => {
    e.preventDefault();
    const alteracoes = {};
    if (form.status !== chamado.status) alteracoes.status = form.status;
    if ((form.tecnico_id || null) !== (chamado.tecnico_id ?? null)) alteracoes.tecnico_id = form.tecnico_id ? Number(form.tecnico_id) : null;
    if (form.prioridade !== chamado.prioridade) alteracoes.prioridade = form.prioridade;
    if (Object.keys(alteracoes).length === 0) return;
    executar(() => api(`/chamados/${chamado.id}`, { method: 'PATCH', body: alteracoes }));
  };

  const mudou = form.status !== chamado.status || String(form.tecnico_id) !== String(chamado.tecnico_id ?? '')
    || form.prioridade !== chamado.prioridade;

  return (
    <Bloco titulo="Atendimento">
      <div className="space-y-3">
        <Erro>{erro}</Erro>
        {!finalizado(chamado.status) && chamado.tecnico_id !== usuario.id && (
          <button type="button" className="btn-destaque w-full" disabled={salvando}
            onClick={() => executar(() => api(`/chamados/${chamado.id}/assumir`, { method: 'POST' }))}>
            🙋 Assumir chamado
          </button>
        )}
        <form onSubmit={salvar} className="space-y-3">
          <label className="block">
            <span className="rotulo">Status</span>
            <select className="campo" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {catalogo.status.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="rotulo">Técnico responsável</span>
            <select className="campo" value={form.tecnico_id} onChange={(e) => setForm({ ...form, tecnico_id: e.target.value })}>
              <option value="">— Sem técnico —</option>
              {catalogo.tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="rotulo">Prioridade</span>
            <select className="campo" value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })}>
              {catalogo.prioridades.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <span className="mt-1 block text-xs text-texto-suave">Mudar a prioridade recalcula o prazo de SLA.</span>
          </label>
          <button type="submit" className="btn-primario w-full" disabled={!mudou || salvando}>
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </div>
    </Bloco>
  );
}

function Checklist({ artigos }) {
  const [feitos, setFeitos] = useState({});
  if (artigos.length === 0) return null;
  return (
    <Bloco titulo="Base de conhecimento">
      <div className="space-y-4">
        {artigos.map((a) => (
          <div key={a.id}>
            <p className="mb-2 text-sm font-semibold">{a.titulo}</p>
            <ul className="space-y-1.5">
              {a.passos.map((p, i) => {
                const chave = `${a.id}-${i}`;
                return (
                  <li key={chave}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input type="checkbox" className="size-4 accent-primaria" checked={Boolean(feitos[chave])}
                        onChange={(e) => setFeitos({ ...feitos, [chave]: e.target.checked })} />
                      <span className={feitos[chave] ? 'text-texto-suave line-through' : ''}>{p}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Bloco>
  );
}

export default function ChamadoDetalhe() {
  const { id } = useParams();
  const local = useLocation();
  const { usuario, ehTI, categoria, prioridade } = useApp();
  const [chamado, setChamado] = useState(null);
  const [erro, setErro] = useState('');
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erroAcao, setErroAcao] = useState('');

  const carregar = useCallback(async () => {
    try {
      setChamado(await api(`/chamados/${id}`));
      setErro('');
    } catch (e) {
      setErro(e.message);
    }
  }, [id]);

  useEffect(() => {
    setChamado(null);
    carregar();
    const t = setInterval(carregar, 30000);
    return () => clearInterval(t);
  }, [carregar]);

  if (erro && !chamado) {
    return <Vazio icone="🔎" titulo={erro}><Link to="/chamados" className="text-primaria underline">Voltar para os chamados</Link></Vazio>;
  }
  if (!chamado) return <Carregando />;

  const cat = categoria(chamado.categoria);
  const souSolicitante = chamado.solicitante_id === usuario.id;
  const diag = chamado.diagnostico;

  const executar = async (fn) => {
    setEnviando(true);
    setErroAcao('');
    try {
      await fn();
      await carregar();
      return true;
    } catch (e) {
      setErroAcao(e.message);
      return false;
    } finally {
      setEnviando(false);
    }
  };

  const comentar = async (e) => {
    e.preventDefault();
    if (!comentario.trim()) return;
    const ok = await executar(() => api(`/chamados/${chamado.id}/comentarios`, { method: 'POST', body: { texto: comentario } }));
    if (ok) setComentario('');
  };

  const retorno = (acao) => {
    const motivo = acao === 'reabrir' ? window.prompt('O que ainda não está funcionando? (opcional)') : '';
    if (motivo === null) return;
    executar(() => api(`/chamados/${chamado.id}/retorno`, { method: 'POST', body: { acao, motivo } }));
  };

  return (
    <div className="mx-auto max-w-6xl">
      {local.state?.criado && (
        <div className="brilho mb-5 flex animate-surgir items-center gap-4 rounded-2xl border border-primaria/30 bg-primaria-clara p-4 sm:p-5">
          <CheckAnimado tamanho={56} className="shrink-0" />
          <div className="animate-entrar [animation-delay:700ms]">
            <p className="text-lg font-bold text-primaria">Chamado aberto!</p>
            <p className="text-sm text-texto-suave">
              Nº {numero(chamado.id)} · A equipe de TI já foi avisada. Prazo de atendimento: {prioridade(chamado.prioridade).nome.toLowerCase()} ({dataHora(chamado.sla_limite)}).
            </p>
          </div>
        </div>
      )}

      <Link to="/chamados" className="text-sm font-semibold text-texto-suave hover:text-primaria">← Chamados</Link>
      <div className="mt-2 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-14 animate-pop place-items-center rounded-2xl bg-primaria text-3xl" aria-hidden>{cat.icone}</span>
          <div>
            <h1 className="font-mono text-2xl font-bold text-primaria">{numero(chamado.id)} - {cat.nome}</h1>
            <p className="text-sm text-texto-suave">{chamado.setor} · {chamado.nome_usuario} · aberto em {dataHora(chamado.criado_em)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={chamado.status} />
          <PrioridadeBadge prioridade={chamado.prioridade} />
          <SlaBadge chamado={chamado} />
        </div>
      </div>

      {souSolicitante && chamado.status === 'resolvido' && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-destaque bg-destaque-claro p-4">
          <p className="font-medium">A TI marcou este chamado como resolvido. O problema foi solucionado?</p>
          <div className="flex gap-2">
            <button type="button" className="btn-primario" disabled={enviando} onClick={() => retorno('confirmar')}>Sim, encerrar</button>
            <button type="button" className="btn-secundario" disabled={enviando} onClick={() => retorno('reabrir')}>Não, reabrir</button>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <Bloco titulo="Descrição">
            <p className="whitespace-pre-wrap">{chamado.descricao}</p>
            {chamado.anexo && (
              <a href={`/uploads/${chamado.anexo}`} target="_blank" rel="noreferrer" className="mt-4 inline-block">
                <img src={`/uploads/${chamado.anexo}`} alt="Imagem anexada ao chamado"
                  className="max-h-72 rounded-lg border border-borda object-contain hover:opacity-90" />
                <span className="mt-1 block text-xs text-texto-suave">📎 Clique para ampliar</span>
              </a>
            )}
          </Bloco>

          {diag && (
            <Bloco titulo="🤖 Assistente inteligente">
              <ul className="mb-3 space-y-1 text-sm">
                {diag.respostas.map((r) => (
                  <li key={r.pergunta} className="flex justify-between gap-4 border-b border-borda/60 pb-1">
                    <span className="text-texto-suave">{r.pergunta}</span><strong className="shrink-0">{r.resposta}</strong>
                  </li>
                ))}
              </ul>
              {diag.diagnostico && <p className="text-sm"><strong>Diagnóstico inicial:</strong> {diag.diagnostico}</p>}
              {diag.solucao && (
                <p className="mt-1 text-sm text-texto-suave">
                  Solução sugerida: {diag.solucao} {diag.solucao_tentada && <em className="font-semibold text-destaque-escuro">(o usuário tentou e não resolveu)</em>}
                </p>
              )}
            </Bloco>
          )}

          <Bloco titulo="Histórico">
            <Historico itens={chamado.historico} />
            {chamado.status !== 'fechado' && (
              <form onSubmit={comentar} className="mt-6 border-t border-borda pt-4">
                <label className="rotulo" htmlFor="comentario">Adicionar comentário</label>
                <textarea id="comentario" className="campo min-h-20" value={comentario} onChange={(e) => setComentario(e.target.value)}
                  placeholder={ehTI ? 'Ex.: Solicitado reinício do computador' : 'Escreva uma resposta para a TI'} maxLength={3000} />
                <Erro>{erroAcao}</Erro>
                <div className="mt-2 flex justify-end">
                  <button type="submit" className="btn-primario" disabled={enviando || !comentario.trim()}>Enviar</button>
                </div>
              </form>
            )}
          </Bloco>
        </div>

        <aside className="space-y-5">
          {ehTI && <AcoesTecnico chamado={chamado} onAtualizado={carregar} />}

          <Bloco titulo="Dados do chamado">
            <Dados itens={[
              ['Solicitante', chamado.nome_usuario],
              ['Setor', chamado.setor],
              ['Ramal', chamado.ramal],
              ['Patrimônio', chamado.patrimonio],
              ['Técnico', chamado.tecnico_nome ?? 'Aguardando técnico'],
              ['Prioridade', prioridade(chamado.prioridade).nome],
              ['Prazo (SLA)', dataHora(chamado.sla_limite)],
              ['Início do atendimento', chamado.atendimento_inicio && dataHora(chamado.atendimento_inicio)],
              ['Resolvido em', chamado.resolvido_em && dataHora(chamado.resolvido_em)],
            ]} />
          </Bloco>

          {chamado.equipamento && (
            <Bloco titulo="💻 Equipamento">
              <Dados itens={[
                ['Computador', chamado.equipamento.nome_computador],
                ['Usuário', chamado.equipamento.usuario_nome],
                ['Setor', chamado.equipamento.setor],
                ['IP', chamado.equipamento.ip],
                ['MAC', chamado.equipamento.mac],
                ['Patrimônio', chamado.equipamento.patrimonio],
                ['Windows', chamado.equipamento.windows],
                ['Office', chamado.equipamento.office],
                ['Antivírus', chamado.equipamento.antivirus],
              ]} />
            </Bloco>
          )}

          {ehTI && <Checklist key={chamado.id} artigos={chamado.base_conhecimento} />}
        </aside>
      </div>
    </div>
  );
}
