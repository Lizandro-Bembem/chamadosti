import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { tempoRelativo } from '../util.js';

const ICONES = { novo_chamado: '🆕', atualizado: '🔄', resolvido: '✅', sla: '⏰' };
const INTERVALO_MS = 30000;

export default function Notificacoes() {
  const [dados, setDados] = useState({ itens: [], nao_lidas: 0 });
  const [aberto, setAberto] = useState(false);
  const navegar = useNavigate();
  const ultimaQtd = useRef(null);

  const carregar = useCallback(async () => {
    try {
      const d = await api('/notificacoes');
      setDados(d);
      // Avisa o navegador (se o usuário permitiu) quando chegam notificações novas
      if (ultimaQtd.current !== null && d.nao_lidas > ultimaQtd.current && 'Notification' in window
        && Notification.permission === 'granted' && document.hidden) {
        new Notification('Chamados TI', { body: d.itens[0]?.mensagem ?? 'Você tem novas notificações.' });
      }
      ultimaQtd.current = d.nao_lidas;
    } catch { /* tenta de novo no próximo ciclo */ }
  }, []);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, INTERVALO_MS);
    return () => clearInterval(t);
  }, [carregar]);

  const abrir = () => {
    setAberto((v) => !v);
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  };

  const clicar = async (n) => {
    setAberto(false);
    if (!n.lida) await api(`/notificacoes/${n.id}/lida`, { method: 'POST' }).catch(() => {});
    carregar();
    if (n.chamado_id) navegar(`/chamados/${n.chamado_id}`);
  };

  const marcarTodas = async () => {
    await api('/notificacoes/lidas', { method: 'POST' }).catch(() => {});
    carregar();
  };

  return (
    <div className="relative">
      <button type="button" onClick={abrir} className="relative rounded-lg p-2 hover:bg-fundo/10"
        aria-label={`Notificações (${dados.nao_lidas} não lidas)`} aria-expanded={aberto}>
        {/* O sino balança e o contador "pula" sempre que chega notificação nova */}
        <svg key={`sino-${dados.nao_lidas}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden
          className={`size-6 origin-top ${dados.nao_lidas > 0 ? 'animate-balancar' : ''}`}>
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {dados.nao_lidas > 0 && (
          <span key={dados.nao_lidas} className="absolute -top-0.5 -right-0.5 grid min-w-5 animate-pop place-items-center rounded-full bg-destaque px-1 text-[11px] font-bold text-white ring-2 ring-primaria">
            {dados.nao_lidas > 99 ? '99+' : dados.nao_lidas}
          </span>
        )}
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div className="fixed inset-x-2 top-16 z-50 origin-top-right animate-surgir overflow-hidden rounded-xl border border-borda bg-fundo text-texto shadow-xl sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-96">
            <div className="flex items-center justify-between border-b border-borda px-4 py-3">
              <p className="font-semibold">Notificações</p>
              {dados.nao_lidas > 0 && (
                <button type="button" onClick={marcarTodas} className="text-xs font-semibold text-primaria hover:underline">
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <ul className="max-h-[60vh] overflow-y-auto">
              {dados.itens.length === 0 && <li className="px-4 py-8 text-center text-sm text-texto-suave">Nenhuma notificação.</li>}
              {dados.itens.map((n, i) => (
                <li key={n.id} className="escalonado" style={{ '--i': i }}>
                  <button type="button" onClick={() => clicar(n)}
                    className={`flex w-full gap-3 border-b border-borda/60 px-4 py-3 text-left hover:bg-superficie ${n.lida ? '' : 'bg-destaque-claro/50'}`}>
                    <span aria-hidden className="text-lg">{ICONES[n.tipo] ?? '🔔'}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${n.lida ? 'text-texto-suave' : 'font-medium'}`}>{n.mensagem}</span>
                      <span className="mt-0.5 block text-xs text-texto-suave">{tempoRelativo(n.criado_em)}</span>
                    </span>
                    {!n.lida && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-destaque" aria-label="não lida" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
