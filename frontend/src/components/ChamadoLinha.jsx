import { Link } from 'react-router-dom';
import { useApp } from '../contexto.jsx';
import { numero, tempoRelativo } from '../util.js';
import { PrioridadeBadge, SlaBadge, StatusBadge } from './ui.jsx';

/** Linha de chamado no formato "001 - Impressora / Financeiro / João". */
export default function ChamadoLinha({ chamado: c, acao, indice = 0 }) {
  const { categoria } = useApp();
  const cat = categoria(c.categoria);

  return (
    <li style={{ '--i': indice }} className="escalonado group relative flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-borda px-4 py-3.5 last:border-b-0 hover:bg-superficie/70 @3xl:flex-nowrap">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primaria-clara text-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" aria-hidden>
        {cat.icone}
      </span>
      <div className="min-w-0 flex-1 basis-40">
        <Link to={`/chamados/${c.id}`} className="font-mono text-[15px] font-bold text-primaria after:absolute after:inset-0 hover:underline">
          {numero(c.id)} - {cat.nome}
        </Link>
        <p className="text-sm text-texto">{c.setor}</p>
        <p className="text-sm text-texto-suave">{c.nome_usuario}</p>
      </div>
      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 pl-14 @3xl:w-[340px] @3xl:shrink-0 @3xl:justify-end @3xl:pl-0">
        <StatusBadge status={c.status} />
        <PrioridadeBadge prioridade={c.prioridade} />
        <SlaBadge chamado={c} />
        <span className="w-full text-xs text-texto-suave @3xl:text-right">
          {c.tecnico_nome ? `👤 ${c.tecnico_nome}` : 'Sem técnico'} · aberto {tempoRelativo(c.criado_em)}
        </span>
      </div>
      {acao && <div className="relative z-10 shrink-0">{acao}</div>}
    </li>
  );
}
