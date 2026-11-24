const CHAVE_TOKEN = 'chamados_ti_token';

export const sessao = {
  get() {
    try { return localStorage.getItem(CHAVE_TOKEN); } catch { return null; }
  },
  set(token) {
    try { localStorage.setItem(CHAVE_TOKEN, token); } catch { /* navegador sem armazenamento */ }
  },
  limpar() {
    try { localStorage.removeItem(CHAVE_TOKEN); } catch { /* idem */ }
  },
};

/**
 * Chamada à API. Envia JSON (body) ou FormData (form) e devolve o JSON da resposta.
 * Em caso de erro lança Error com a mensagem enviada pelo servidor.
 */
export async function api(caminho, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = sessao.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let resposta;
  try {
    resposta = await fetch(`/api${caminho}`, { method, headers, body: payload });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Verifique se a API está rodando.');
  }

  if (resposta.status === 401 && caminho !== '/auth/login') {
    sessao.limpar();
    window.dispatchEvent(new Event('sessao-expirada'));
  }
  if (resposta.status === 204) return null;

  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new Error(dados?.erro || `Erro ${resposta.status} ao comunicar com o servidor.`);
  return dados;
}

/** Monta a query string ignorando filtros vazios. */
export function qs(filtros) {
  const p = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) p.set(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}
