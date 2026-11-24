export const numero = (id) => String(id).padStart(3, '0');

const fmtDataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const fmtData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });
const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const dataHora = (iso) => (iso ? fmtDataHora.format(new Date(iso)) : '—');
export const data = (iso) => (iso ? fmtData.format(new Date(iso)) : '—');
export const hora = (iso) => (iso ? fmtHora.format(new Date(iso)) : '');

/** 35 -> "35 min" | 135 -> "2h 15min" | 1500 -> "1d 1h" */
export function duracao(minutos) {
  if (minutos === null || minutos === undefined || Number.isNaN(minutos)) return '—';
  const m = Math.round(Math.abs(minutos));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h}h ${m % 60}min` : `${h}h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d}d ${h % 24}h` : `${d}d`;
}

export function tempoRelativo(iso) {
  const min = (Date.now() - new Date(iso).getTime()) / 60000;
  if (min < 1) return 'agora';
  if (min < 60 * 24) return `há ${duracao(min)}`;
  return data(iso);
}

const FINALIZADOS = ['resolvido', 'fechado'];
export const finalizado = (status) => FINALIZADOS.includes(status);

/**
 * Situação do SLA de um chamado.
 * nivel: ok | atencao | vencido | cumprido | estourado
 */
export function situacaoSla(chamado, agora = Date.now()) {
  const limite = new Date(chamado.sla_limite).getTime();
  if (finalizado(chamado.status)) {
    const fim = new Date(chamado.resolvido_em ?? chamado.fechado_em ?? agora).getTime();
    return fim <= limite
      ? { nivel: 'cumprido', texto: 'SLA cumprido' }
      : { nivel: 'estourado', texto: `SLA estourado em ${duracao((fim - limite) / 60000)}` };
  }
  const restante = (limite - agora) / 60000;
  if (restante < 0) return { nivel: 'vencido', texto: `Vencido há ${duracao(-restante)}` };
  const total = (limite - new Date(chamado.criado_em).getTime()) / 60000;
  return {
    nivel: restante <= total * 0.25 ? 'atencao' : 'ok',
    texto: `Vence em ${duracao(restante)}`,
  };
}

export const hojeISO = () => new Date().toLocaleDateString('sv-SE');
