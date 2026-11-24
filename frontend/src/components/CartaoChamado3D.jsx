import { useRef, useState } from 'react';
import { preferePoucoMovimento } from './animacao.jsx';

// Cada "tema" é um status do chamado: muda as cores do cartão e o que aparece no histórico do verso.
const TEMAS = [
  {
    id: 'aberto', nome: 'Aberto', ponto: '#FE7C00', etapas: 1,
    fundo: 'linear-gradient(135deg, #ff9a33 0%, #FE7C00 45%, #c85f00 100%)', texto: '#FEFEFD', selo: 'rgb(254 254 253 / 0.22)',
  },
  {
    id: 'em_atendimento', nome: 'Em atendimento', ponto: '#075930', etapas: 3,
    fundo: 'linear-gradient(135deg, #0f7a45 0%, #075930 50%, #03361b 100%)', texto: '#FEFEFD', selo: 'rgb(254 124 0 / 0.9)',
  },
  {
    id: 'resolvido', nome: 'Resolvido', ponto: '#2f7a55', etapas: 5,
    fundo: 'linear-gradient(135deg, #FEFEFD 0%, #eef5f1 55%, #d9eae1 100%)', texto: '#075930', selo: 'rgb(7 89 48 / 0.12)',
  },
];

const HISTORICO = [
  ['08:15', 'Chamado aberto'],
  ['08:17', 'Técnico João assumiu'],
  ['08:30', 'Solicitado reinício'],
  ['08:35', 'Problema resolvido'],
  ['08:36', 'Chamado encerrado'],
];

const limitar = (v, min, max) => Math.max(min, Math.min(max, v));

/**
 * Cartão de chamado em 3D: arraste para girar, clique para virar
 * e escolha um status para trocar a cor (o cartão dá uma volta completa).
 */
export default function CartaoChamado3D() {
  const [tema, setTema] = useState(0);
  // angulo: rotação "assentada" (múltiplos de 180°); rot: inclinação/arrasto momentâneo
  const [angulo, setAngulo] = useState(0);
  const [rot, setRot] = useState({ x: 0, y: 0 });
  const [arrastando, setArrastando] = useState(false);
  const inicio = useRef(null);
  const t = TEMAS[tema];

  const baixar = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    inicio.current = { x: e.clientX, y: e.clientY, rot: { x: 0, y: 0 }, moveu: false };
    setRot({ x: 0, y: 0 });
    setArrastando(true);
  };

  const mover = (e) => {
    if (preferePoucoMovimento()) return;
    if (!inicio.current) {
      // Sem arrastar: inclina levemente na direção do mouse
      const r = e.currentTarget.getBoundingClientRect();
      setRot({ x: ((e.clientY - r.top) / r.height - 0.5) * -14, y: ((e.clientX - r.left) / r.width - 0.5) * 18 });
      return;
    }
    const dx = e.clientX - inicio.current.x;
    const dy = e.clientY - inicio.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) inicio.current.moveu = true;
    setRot({ x: limitar(inicio.current.rot.x - dy * 0.5, -40, 40), y: inicio.current.rot.y + dx * 0.6 });
  };

  const soltar = () => {
    if (!inicio.current) return;
    // Clique vira o cartão; arrasto "encaixa" no lado mais próximo
    if (!inicio.current.moveu) setAngulo((a) => a + 180);
    else setAngulo((a) => Math.round((a + rot.y) / 180) * 180);
    inicio.current = null;
    setArrastando(false);
    setRot({ x: 0, y: 0 });
  };

  const sair = () => { if (!inicio.current) setRot({ x: 0, y: 0 }); };

  const trocarTema = (i) => {
    if (i === tema) return;
    setTema(i);
    setAngulo((a) => a + 360);
  };

  const anguloY = angulo + rot.y;
  const face = {
    position: 'absolute', inset: 0, borderRadius: 20, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
    background: t.fundo, color: t.texto, transition: 'background 0.6s ease, color 0.6s ease',
    boxShadow: '0 30px 60px -20px rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.25)',
  };
  // Reflexo de luz que acompanha a rotação
  const reflexo = {
    position: 'absolute', inset: 0, borderRadius: 20, pointerEvents: 'none',
    background: `linear-gradient(${115 + rot.y}deg, transparent 30%, rgb(255 255 255 / 0.28) 48%, transparent 62%)`,
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="animate-flutuar" style={{ perspective: 1100 }}>
        <div
          role="img"
          aria-label={`Cartão do chamado 001 - Impressora, status ${t.nome}`}
          className={`relative h-[214px] w-[340px] touch-none select-none ${arrastando ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rot.x}deg) rotateY(${anguloY}deg)`,
            transition: arrastando ? 'none' : 'transform 0.9s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
          onPointerDown={baixar}
          onPointerMove={mover}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          onPointerLeave={sair}
        >
          {/* Frente */}
          <div style={face} className="flex flex-col justify-between overflow-hidden p-5">
            <span className="pointer-events-none absolute -right-6 -bottom-10 text-[150px] leading-none font-black opacity-[0.08]">TI</span>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-extrabold">
                <svg viewBox="0 0 32 32" className="size-6" aria-hidden>
                  <path d="M8 10h16v10H8z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
                  <path d="M12.5 24h7M16 20v4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                  <circle cx="24.5" cy="8.5" r="3.6" fill={tema === 0 ? '#FEFEFD' : '#FE7C00'} />
                </svg>
                Chamados TI
              </span>
              <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: t.selo, transition: 'background 0.6s ease' }}>
                {t.nome}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-12 place-items-center rounded-lg text-2xl shadow-inner" style={{ background: 'linear-gradient(135deg, #f8d77a, #d9a93a)' }}>🖨️</span>
              <span className="font-mono text-xl font-bold tracking-wider">#001 - Impressora</span>
            </div>
            <div className="flex items-end justify-between text-xs">
              <span>
                <span className="block opacity-70">Solicitante</span>
                <span className="font-semibold">João · Financeiro</span>
              </span>
              <span className="text-right">
                <span className="block opacity-70">SLA</span>
                <span className="font-semibold">⏱ {tema === 2 ? 'Cumprido' : '8h'}</span>
              </span>
            </div>
            <span style={reflexo} />
          </div>

          {/* Verso */}
          <div style={{ ...face, transform: 'rotateY(180deg)' }} className="overflow-hidden">
            <div className="mt-5 h-9" style={{ background: tema === 2 ? '#075930' : 'rgb(0 0 0 / 0.45)' }} />
            <div className="px-5 pt-3">
              <p className="mb-1.5 text-[11px] font-bold tracking-widest uppercase opacity-80">Histórico</p>
              <ol className="space-y-0.5 font-mono text-[11px]">
                {HISTORICO.map(([h, d], i) => (
                  <li key={h} className="flex gap-2 transition-opacity duration-500" style={{ opacity: i < t.etapas ? 1 : 0.22 }}>
                    <span className="font-bold">{h}</span><span>{d}</span>
                  </li>
                ))}
              </ol>
            </div>
            <span style={reflexo} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="Status do cartão">
        {TEMAS.map((tm, i) => (
          <button key={tm.id} type="button" role="radio" aria-checked={tema === i} onClick={() => trocarTema(i)}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              tema === i ? 'bg-fundo text-primaria shadow' : 'bg-fundo/10 text-fundo hover:bg-fundo/20'}`}>
            <span className="size-2.5 rounded-full ring-2 ring-fundo/60" style={{ background: tm.ponto }} />
            {tm.nome}
          </button>
        ))}
      </div>
      <p className="text-xs text-fundo/60">Arraste o cartão para girar. Clique para virar.</p>
    </div>
  );
}
