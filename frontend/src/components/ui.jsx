import { useEffect } from 'react';
import { useApp } from '../contexto.jsx';
import { situacaoSla } from '../util.js';

export function Carregando({ tela = false, texto = 'Carregando...' }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-texto-suave ${tela ? 'min-h-screen' : 'py-16'}`}>
      <span className="size-5 animate-spin rounded-full border-2 border-primaria/25 border-t-primaria" />
      <span className="text-sm">{texto}</span>
    </div>
  );
}

export function Erro({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {children}
    </div>
  );
}

export function Vazio({ icone = '📭', titulo, children }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
      <span className="text-4xl" aria-hidden>{icone}</span>
      <p className="font-semibold">{titulo}</p>
      {children && <div className="max-w-sm text-sm text-texto-suave">{children}</div>}
    </div>
  );
}

export function Cabecalho({ titulo, subtitulo, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primaria">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-texto-suave">{subtitulo}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

const CORES_STATUS = {
  aberto: 'bg-destaque-claro text-destaque-escuro ring-destaque/30',
  em_atendimento: 'bg-primaria-clara text-primaria ring-primaria/25',
  aguardando_usuario: 'bg-amber-50 text-amber-800 ring-amber-300/60',
  aguardando_fornecedor: 'bg-violet-50 text-violet-800 ring-violet-300/60',
  resolvido: 'bg-emerald-50 text-emerald-800 ring-emerald-300/60',
  fechado: 'bg-zinc-100 text-zinc-600 ring-zinc-300/60',
};

export function StatusBadge({ status }) {
  const { nomeStatus } = useApp();
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${CORES_STATUS[status] ?? CORES_STATUS.fechado}`}>
      {nomeStatus(status)}
    </span>
  );
}

const CORES_PRIORIDADE = {
  baixa: 'text-zinc-600',
  media: 'text-sky-700',
  alta: 'text-destaque-escuro',
  critica: 'text-red-700',
};
const MARCADOR_PRIORIDADE = { baixa: '▁', media: '▃', alta: '▅', critica: '▇' };

export function PrioridadeBadge({ prioridade: id }) {
  const { prioridade } = useApp();
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${CORES_PRIORIDADE[id] ?? ''}`}>
      <span aria-hidden>{MARCADOR_PRIORIDADE[id]}</span>
      {prioridade(id).nome}
    </span>
  );
}

const CORES_SLA = {
  ok: 'text-primaria',
  atencao: 'text-destaque-escuro',
  vencido: 'text-red-700',
  cumprido: 'text-emerald-700',
  estourado: 'text-red-700',
};
const ICONES_SLA = { ok: '⏱', atencao: '⚠', vencido: '⛔', cumprido: '✔', estourado: '✖' };

export function SlaBadge({ chamado }) {
  const s = situacaoSla(chamado);
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${CORES_SLA[s.nivel]}`}>
      <span aria-hidden>{ICONES_SLA[s.nivel]}</span>
      {s.texto}
    </span>
  );
}

export function Modal({ titulo, aberto, onFechar, children, largura = 'max-w-lg' }) {
  useEffect(() => {
    if (!aberto) return undefined;
    const tecla = (e) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aberto, onFechar]);

  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex animate-fundo items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={onFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`max-h-[92vh] w-full animate-surgir overflow-y-auto rounded-t-2xl bg-fundo shadow-xl sm:rounded-2xl ${largura}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-borda bg-fundo px-5 py-4">
          <h2 className="text-lg font-bold text-primaria">{titulo}</h2>
          <button type="button" onClick={onFechar} className="rounded-md px-2 py-1 text-xl leading-none text-texto-suave hover:bg-superficie" aria-label="Fechar">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Campo({ rotulo, dica, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="rotulo">{rotulo}</span>
      {children}
      {dica && <span className="mt-1 block text-xs text-texto-suave">{dica}</span>}
    </label>
  );
}
