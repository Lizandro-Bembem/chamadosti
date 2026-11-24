import { useEffect } from 'react';
import { preferePoucoMovimento } from './animacao.jsx';

const CHAVE = 'chamados_ti_splash';

/** Mostra a abertura só uma vez por sessão do navegador. */
export function deveMostrarSplash() {
  if (preferePoucoMovimento()) return false;
  try {
    return !sessionStorage.getItem(CHAVE);
  } catch {
    return true; // sem armazenamento: mostra mesmo assim
  }
}

/** Tela de abertura: logo surge, a linha laranja é desenhada e a tela "entra" com zoom. */
export default function Splash({ onFim }) {
  useEffect(() => {
    try { sessionStorage.setItem(CHAVE, '1'); } catch { /* ignora */ }
    const t = setTimeout(onFim, 2350);
    return () => clearTimeout(t);
  }, [onFim]);

  return (
    <div className="splash fixed inset-0 z-[100] grid cursor-pointer place-items-center overflow-hidden bg-primaria" onClick={onFim} aria-hidden>
      <span className="splash-marca-dagua pointer-events-none absolute text-[26vw] leading-none font-black whitespace-nowrap text-fundo/[0.05] select-none">
        HELP DESK
      </span>
      <div className="relative text-center">
        <span className="splash-icone mx-auto mb-5 grid size-24 place-items-center rounded-3xl bg-fundo/10 ring-1 ring-fundo/25">
          <svg viewBox="0 0 32 32" className="size-16">
            <path d="M8 10h16v10H8z" fill="none" stroke="#FEFEFD" strokeWidth="2" strokeLinejoin="round" />
            <path d="M12.5 24h7M16 20v4" stroke="#FEFEFD" strokeWidth="2" strokeLinecap="round" />
            <circle cx="24.5" cy="8.5" r="3.6" fill="#FE7C00" />
          </svg>
        </span>
        <h1 className="splash-titulo text-5xl font-extrabold text-fundo sm:text-7xl">Chamados TI</h1>
        <span className="splash-linha mx-auto mt-4 block h-1.5 w-48 origin-left rounded-full bg-destaque sm:w-64" />
        <p className="splash-subtitulo mt-5 text-sm font-semibold tracking-[0.35em] text-fundo/70 uppercase">Help Desk TI</p>
      </div>
    </div>
  );
}
