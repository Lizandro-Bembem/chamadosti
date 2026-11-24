import { useCallback, useEffect, useRef, useState } from 'react';

export const preferePoucoMovimento = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Círculo com check desenhado (confirmação animada). */
export function CheckAnimado({ tamanho = 64, className = '' }) {
  return (
    <svg viewBox="0 0 52 52" width={tamanho} height={tamanho} className={`check-animado ${className}`} aria-hidden>
      <circle className="check-circulo" cx="26" cy="26" r="24" fill="none" />
      <path className="check-traco" fill="none" d="M15 27l7.5 7.5L38 19" />
    </svg>
  );
}

/** Faz um número "contar" de 0 até o valor (ou do valor anterior até o novo). */
export function useContagem(valor, duracao = 800) {
  const numerico = typeof valor === 'number' && Number.isFinite(valor);
  const [atual, setAtual] = useState(numerico && !preferePoucoMovimento() ? 0 : valor);
  const anterior = useRef(0);

  useEffect(() => {
    if (!numerico || preferePoucoMovimento()) {
      setAtual(valor);
      return undefined;
    }
    const inicio = performance.now();
    const de = anterior.current;
    let quadro;
    const passo = (agora) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      const suave = 1 - (1 - t) ** 3;
      setAtual(Math.round(de + (valor - de) * suave));
      if (t < 1) quadro = requestAnimationFrame(passo);
      else anterior.current = valor;
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [valor, numerico, duracao]);

  return numerico ? atual : valor;
}

/** Inclinação 3D que acompanha o mouse (use junto com a classe "inclinar"). */
export function useInclinar(intensidade = 8) {
  const mover = useCallback((e) => {
    if (preferePoucoMovimento()) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ry', `${(x * intensidade).toFixed(2)}deg`);
    el.style.setProperty('--rx', `${(-y * intensidade).toFixed(2)}deg`);
  }, [intensidade]);
  const sair = useCallback((e) => {
    e.currentTarget.style.setProperty('--ry', '0deg');
    e.currentTarget.style.setProperty('--rx', '0deg');
  }, []);
  return { onPointerMove: mover, onPointerLeave: sair };
}
