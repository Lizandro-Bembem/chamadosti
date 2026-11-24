import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../contexto.jsx';
import { Cabecalho, Campo, Erro } from '../components/ui.jsx';
import { duracao } from '../util.js';
import { CheckAnimado, useInclinar } from '../components/animacao.jsx';

const ETAPAS = ['Problema', 'Assistente', 'Dados do chamado'];

function Etapas({ atual }) {
  return (
    <ol className="mb-6 flex items-center gap-2 text-sm">
      {ETAPAS.map((nome, i) => (
        <li key={nome} className="flex items-center gap-2">
          <span className={`grid size-7 place-items-center rounded-full text-xs font-bold ${
            i < atual ? 'bg-primaria text-fundo' : i === atual ? 'bg-destaque text-white' : 'bg-borda text-texto-suave'}`}>
            {i < atual ? '✓' : i + 1}
          </span>
          <span className={`hidden sm:inline ${i === atual ? 'font-semibold' : 'text-texto-suave'}`}>{nome}</span>
          {i < ETAPAS.length - 1 && <span className="mx-1 h-px w-6 bg-borda sm:w-10" />}
        </li>
      ))}
    </ol>
  );
}

/* ----------------------------------------------------------- Etapa 1 */
function EscolherProblema({ onEscolher }) {
  const { catalogo } = useApp();
  const inclinar = useInclinar(14);
  return (
    <section className="cartao p-5">
      <h2 className="text-lg font-bold">Qual é o problema?</h2>
      <p className="mb-5 text-sm text-texto-suave">Escolha a opção que mais combina com o que está acontecendo.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {catalogo.categorias.map((c, i) => (
          <button key={c.id} type="button" onClick={() => onEscolher(c)} style={{ '--i': i }} {...inclinar}
            className="escalonado inclinar group flex flex-col items-center gap-2 rounded-xl border-2 border-borda bg-fundo px-3 py-5 text-center hover:border-destaque hover:bg-destaque-claro/40">
            <span className="text-3xl transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-6" aria-hidden>{c.icone}</span>
            <span className="text-sm font-semibold">{c.nome}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- Etapa 2 */
function Assistente({ categoria, onConcluir, onVoltar }) {
  const perguntas = categoria.assistente.perguntas;
  const [respostas, setRespostas] = useState({});
  const [resultado, setResultado] = useState(null);
  const [resolvido, setResolvido] = useState(false);
  const [erro, setErro] = useState('');
  const respondidas = perguntas.filter((p) => respostas[p.id]).length;
  const completo = respondidas === perguntas.length;

  useEffect(() => {
    if (!completo) return;
    api('/chamados/assistente', { method: 'POST', body: { categoria: categoria.id, respostas } })
      .then(setResultado)
      .catch((e) => setErro(e.message));
  }, [completo, categoria.id, respostas]);

  const responder = (id, valor) => {
    setResultado(null);
    setRespostas((r) => {
      // Ao mudar uma resposta, as perguntas seguintes são refeitas
      const indice = perguntas.findIndex((p) => p.id === id);
      const novo = {};
      perguntas.slice(0, indice).forEach((p) => { if (r[p.id]) novo[p.id] = r[p.id]; });
      novo[id] = valor;
      return novo;
    });
  };

  if (resolvido) {
    return (
      <section className="cartao animate-surgir p-8 text-center">
        <CheckAnimado tamanho={88} className="mx-auto" />
        <h2 className="mt-4 animate-entrar text-xl font-bold text-primaria [animation-delay:900ms]">Que bom que resolveu!</h2>
        <p className="mt-1 text-texto-suave">Nenhum chamado foi aberto. Se o problema voltar, é só abrir um novo.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/chamados" className="btn-secundario">Ver meus chamados</Link>
          <Link to="/base-conhecimento" className="btn-primario">Base de conhecimento</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="cartao p-5">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primaria text-xl" aria-hidden>🤖</span>
        <div>
          <h2 className="text-lg font-bold">Assistente inteligente · {categoria.icone} {categoria.nome}</h2>
          <p className="text-sm text-texto-suave">Responda rapidinho: talvez dê para resolver agora, sem esperar a TI.</p>
        </div>
      </div>

      <div className="space-y-4">
        {perguntas.slice(0, respondidas + 1).map((p, i) => (
          <fieldset key={p.id} className="animate-entrar rounded-xl border border-borda p-4">
            <legend className="px-1 text-sm font-semibold">
              <span className="text-destaque-escuro">Pergunta {i + 1}:</span> {p.texto}
            </legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {p.opcoes.map((o) => (
                <button key={o} type="button" onClick={() => responder(p.id, o)} aria-pressed={respostas[p.id] === o}
                  className={`min-w-20 rounded-lg border-2 px-4 py-2 text-sm font-semibold transition active:scale-95 ${
                    respostas[p.id] === o ? 'border-primaria bg-primaria text-fundo shadow-md' : 'border-borda hover:-translate-y-0.5 hover:border-primaria/50'}`}>
                  {o}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <Erro>{erro}</Erro>

      {resultado && (
        <div className="mt-5">
          {resultado.solucao ? (
            <div className="brilho animate-surgir rounded-xl border-2 border-destaque bg-destaque-claro p-5">
              <p className="text-sm font-bold tracking-wide text-destaque-escuro uppercase">💡 Tente isto antes de abrir o chamado</p>
              <p className="mt-2 text-base">{resultado.solucao}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn-primario" onClick={() => setResolvido(true)}>Resolveu! Não preciso de chamado</button>
                <button type="button" className="btn-secundario" onClick={() => onConcluir(respostas, resultado, true)}>
                  Não resolveu, abrir chamado
                </button>
              </div>
            </div>
          ) : (
            <div className="brilho animate-surgir rounded-xl border border-primaria/30 bg-primaria-clara p-5">
              <p className="text-sm font-bold tracking-wide text-primaria uppercase">Diagnóstico inicial</p>
              <p className="mt-2">{resultado.diagnostico}</p>
              <p className="mt-1 text-sm text-texto-suave">Esse diagnóstico vai junto com o chamado para agilizar o atendimento.</p>
              <button type="button" className="btn-destaque mt-4" onClick={() => onConcluir(respostas, resultado, false)}>
                Continuar para abrir o chamado →
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex justify-between border-t border-borda pt-4">
        <button type="button" className="btn-secundario" onClick={onVoltar}>← Trocar problema</button>
        {!completo && (
          <button type="button" className="text-sm font-semibold text-texto-suave hover:text-primaria" onClick={() => onConcluir(respostas, null, false)}>
            Pular assistente
          </button>
        )}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- Etapa 3 */
function EquipamentoInfo({ equipamento: e }) {
  const itens = [
    ['Computador', e.nome_computador], ['Usuário', e.usuario_nome], ['Setor', e.setor], ['IP', e.ip], ['MAC', e.mac],
    ['Windows', e.windows], ['Office', e.office], ['Antivírus', e.antivirus],
  ];
  return (
    <div className="animate-surgir rounded-xl border border-primaria/25 bg-primaria-clara/60 p-4">
      <p className="mb-2 text-sm font-bold text-primaria">💻 Equipamento encontrado · {e.patrimonio}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
        {itens.map(([k, v]) => (
          <div key={k}><dt className="text-xs text-texto-suave">{k}</dt><dd className="font-medium break-all">{v || '—'}</dd></div>
        ))}
      </dl>
    </div>
  );
}

function FormularioChamado({ categoria, assistente, onTrocar }) {
  const { usuario, catalogo, ehTI, prioridade } = useApp();
  const navegar = useNavigate();
  const [form, setForm] = useState({
    nome_usuario: ehTI ? '' : usuario.nome,
    setor: ehTI ? '' : usuario.setor ?? '',
    ramal: ehTI ? '' : usuario.ramal ?? '',
    patrimonio: '',
    prioridade: assistente.resultado?.prioridade ?? 'media',
    descricao: '',
  });
  const [anexo, setAnexo] = useState(null);
  const [equipamento, setEquipamento] = useState(null);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const previa = useMemo(() => (anexo ? URL.createObjectURL(anexo) : null), [anexo]);
  useEffect(() => () => previa && URL.revokeObjectURL(previa), [previa]);

  // Usuário comum: já traz o computador cadastrado no nome dele
  useEffect(() => {
    if (ehTI) return;
    api('/equipamentos').then((lista) => {
      if (lista[0]) {
        setEquipamento(lista[0]);
        setForm((f) => ({ ...f, patrimonio: f.patrimonio || lista[0].patrimonio }));
      }
    }).catch(() => {});
  }, [ehTI]);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const buscarPatrimonio = async () => {
    setAviso('');
    const p = form.patrimonio.trim();
    if (!p) return setEquipamento(null);
    if (equipamento?.patrimonio.toLowerCase() === p.toLowerCase()) return;
    try {
      const eq = await api(`/equipamentos/patrimonio/${encodeURIComponent(p)}`);
      setEquipamento(eq);
      setForm((f) => ({
        ...f,
        setor: f.setor || eq.setor || '',
        nome_usuario: f.nome_usuario || eq.usuario_nome || '',
      }));
    } catch {
      setEquipamento(null);
      setAviso('Patrimônio não cadastrado. O chamado pode ser aberto mesmo assim.');
    }
  };

  const escolherAnexo = (e) => {
    const arquivo = e.target.files?.[0];
    setErro('');
    if (arquivo && arquivo.size > 5 * 1024 * 1024) {
      setErro('A imagem pode ter no máximo 5 MB.');
      e.target.value = '';
      return;
    }
    setAnexo(arquivo ?? null);
  };

  const enviar = async (e) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append('categoria', categoria.id);
    fd.append('respostas', JSON.stringify(assistente.respostas ?? {}));
    fd.append('solucao_tentada', String(Boolean(assistente.solucaoTentada)));
    if (anexo) fd.append('anexo', anexo);
    try {
      const novo = await api('/chamados', { method: 'POST', form: fd });
      navegar(`/chamados/${novo.id}`, { state: { criado: true } });
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  };

  const sla = prioridade(form.prioridade).slaMinutos;

  return (
    <form onSubmit={enviar} className="cartao space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-primaria-clara text-2xl" aria-hidden>{categoria.icone}</span>
          <div>
            <p className="text-xs text-texto-suave">Categoria</p>
            <p className="font-bold">{categoria.nome}</p>
          </div>
        </div>
        <button type="button" onClick={onTrocar} className="text-sm font-semibold text-primaria hover:underline">Trocar problema</button>
      </div>

      {assistente.resultado?.diagnostico && (
        <div className="rounded-lg bg-superficie px-4 py-3 text-sm">
          <span className="font-semibold">🤖 Diagnóstico do assistente:</span> {assistente.resultado.diagnostico}
        </div>
      )}

      <Erro>{erro}</Erro>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome do usuário *">
          <input className="campo" value={form.nome_usuario} onChange={set('nome_usuario')} required maxLength={120} />
        </Campo>
        <Campo rotulo="Setor *">
          <input className="campo" list="lista-setores" value={form.setor} onChange={set('setor')} required maxLength={80} />
          <datalist id="lista-setores">{catalogo.setores.map((s) => <option key={s} value={s} />)}</datalist>
        </Campo>
        <Campo rotulo="Ramal">
          <input className="campo" value={form.ramal} onChange={set('ramal')} maxLength={20} inputMode="numeric" />
        </Campo>
        <Campo rotulo="Patrimônio do equipamento" dica={aviso || 'Ao informar, os dados do computador aparecem automaticamente.'}>
          <input className="campo" value={form.patrimonio} onChange={set('patrimonio')} onBlur={buscarPatrimonio}
            placeholder="Ex.: PAT-1001" maxLength={40} />
        </Campo>
      </div>

      {equipamento && <EquipamentoInfo equipamento={equipamento} />}

      <fieldset>
        <legend className="rotulo">Prioridade *</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {catalogo.prioridades.map((p) => (
            <label key={p.id} className={`cursor-pointer rounded-lg border-2 px-3 py-2 text-center transition ${
              form.prioridade === p.id ? 'border-destaque bg-destaque-claro' : 'border-borda hover:border-destaque/50'}`}>
              <input type="radio" name="prioridade" value={p.id} checked={form.prioridade === p.id} onChange={set('prioridade')} className="sr-only" />
              <span className="block text-sm font-bold">{p.nome}</span>
              <span className="block text-xs text-texto-suave">até {duracao(p.slaMinutos)}</span>
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-texto-suave">
          Prazo de atendimento (SLA): <strong>{duracao(sla)}</strong>
          {assistente.resultado?.prioridade && ' · prioridade sugerida pelo assistente'}
        </p>
      </fieldset>

      <Campo rotulo="Descrição *">
        <textarea className="campo min-h-32" value={form.descricao} onChange={set('descricao')} required maxLength={5000}
          placeholder="Conte o que aconteceu, desde quando e se aparece alguma mensagem." />
      </Campo>

      <div>
        <span className="rotulo">Anexar imagem</span>
        <div className="flex flex-wrap items-center gap-3">
          <label className="btn-secundario cursor-pointer">
            📎 {anexo ? 'Trocar imagem' : 'Escolher imagem'}
            <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" onChange={escolherAnexo} />
          </label>
          {anexo && (
            <>
              <img src={previa} alt="Prévia do anexo" className="h-16 w-24 rounded-lg border border-borda object-cover" />
              <button type="button" className="text-sm text-red-700 hover:underline" onClick={() => setAnexo(null)}>Remover</button>
            </>
          )}
          <span className="text-xs text-texto-suave">Print da tela ou foto do problema (até 5 MB).</span>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-borda pt-4">
        <Link to="/chamados" className="btn-secundario">Cancelar</Link>
        <button type="submit" className="btn-destaque" disabled={enviando}>{enviando ? 'Abrindo...' : 'Abrir chamado'}</button>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------- Página */
export default function NovoChamado() {
  const [categoria, setCategoria] = useState(null);
  const [assistente, setAssistente] = useState(null);

  const etapa = !categoria ? 0 : !assistente ? 1 : 2;

  const escolher = (c) => {
    setCategoria(c);
    setAssistente(c.assistente ? null : {});
  };
  const reiniciar = () => { setCategoria(null); setAssistente(null); };

  return (
    <div className="mx-auto max-w-4xl">
      <Cabecalho titulo="Novo chamado" subtitulo="Descreva o problema e a equipe de TI será avisada na hora." />
      <Etapas atual={etapa} />
      {etapa === 0 && <EscolherProblema onEscolher={escolher} />}
      {etapa === 1 && (
        <div className="animate-entrar">
          <Assistente
            categoria={categoria}
            onVoltar={reiniciar}
            onConcluir={(respostas, resultado, solucaoTentada) => setAssistente({ respostas, resultado, solucaoTentada })}
          />
        </div>
      )}
      {etapa === 2 && (
        <div className="animate-entrar">
          <FormularioChamado categoria={categoria} assistente={assistente} onTrocar={reiniciar} />
        </div>
      )}
    </div>
  );
}
