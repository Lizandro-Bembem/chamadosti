import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../contexto.jsx';
import { Cabecalho, Campo, Carregando, Erro, Modal, Vazio } from '../components/ui.jsx';
import { useInclinar } from '../components/animacao.jsx';

function FormArtigo({ inicial, onSalvo, onCancelar }) {
  const { catalogo } = useApp();
  const [form, setForm] = useState({
    categoria: inicial?.categoria ?? catalogo.categorias[0].id,
    titulo: inicial?.titulo ?? '',
    passos: (inicial?.passos ?? []).join('\n'),
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    const corpo = { ...form, passos: form.passos.split('\n').map((p) => p.trim()).filter(Boolean) };
    try {
      if (inicial?.id) await api(`/base-conhecimento/${inicial.id}`, { method: 'PUT', body: corpo });
      else await api('/base-conhecimento', { method: 'POST', body: corpo });
      onSalvo();
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={salvar} className="space-y-4">
      <Erro>{erro}</Erro>
      <Campo rotulo="Categoria">
        <select className="campo" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
          {catalogo.categorias.map((c) => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}
        </select>
      </Campo>
      <Campo rotulo="Título">
        <input className="campo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required maxLength={160} />
      </Campo>
      <Campo rotulo="Passos do checklist" dica="Um passo por linha.">
        <textarea className="campo min-h-40 font-mono" value={form.passos} onChange={(e) => setForm({ ...form, passos: e.target.value })} required
          placeholder={'Verificar cabo\nReiniciar spool\nTestar impressão'} />
      </Campo>
      <div className="flex justify-end gap-2 border-t border-borda pt-4">
        <button type="button" className="btn-secundario" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn-primario" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
      </div>
    </form>
  );
}

export default function BaseConhecimento() {
  const { ehTI, catalogo, categoria } = useApp();
  const [artigos, setArtigos] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState('');
  const inclinar = useInclinar(6);

  const carregar = useCallback(() => api('/base-conhecimento').then(setArtigos).catch((e) => setErro(e.message)), []);
  useEffect(() => { carregar(); }, [carregar]);
  const fechar = useCallback(() => setEditando(null), []);

  const excluir = async (a) => {
    if (!window.confirm(`Excluir "${a.titulo}"?`)) return;
    try {
      await api(`/base-conhecimento/${a.id}`, { method: 'DELETE' });
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  };

  const visiveis = (artigos ?? []).filter((a) => !filtro || a.categoria === filtro);

  return (
    <>
      <Cabecalho titulo="Base de conhecimento" subtitulo="Checklists para resolver os problemas mais comuns.">
        {ehTI && <button type="button" className="btn-destaque" onClick={() => setEditando({})}>+ Novo artigo</button>}
      </Cabecalho>

      <div className="mb-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => setFiltro('')}
          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${filtro === '' ? 'bg-primaria text-fundo' : 'bg-fundo text-texto-suave ring-1 ring-borda hover:text-texto'}`}>
          Todos
        </button>
        {catalogo.categorias.filter((c) => artigos?.some((a) => a.categoria === c.id)).map((c) => (
          <button key={c.id} type="button" onClick={() => setFiltro(c.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${filtro === c.id ? 'bg-primaria text-fundo' : 'bg-fundo text-texto-suave ring-1 ring-borda hover:text-texto'}`}>
            {c.icone} {c.nome}
          </button>
        ))}
      </div>

      <Erro>{erro}</Erro>
      {!artigos && <Carregando />}
      {artigos && visiveis.length === 0 && <div className="cartao"><Vazio icone="📚" titulo="Nenhum artigo cadastrado" /></div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visiveis.map((a, i) => {
          const cat = categoria(a.categoria);
          return (
            <article key={a.id} style={{ '--i': i }} {...inclinar} className="cartao escalonado inclinar flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 bg-destaque-claro px-4 py-2.5">
                <span aria-hidden>{cat.icone}</span>
                <span className="text-sm font-bold text-destaque-escuro">{cat.nome}</span>
              </div>
              <div className="flex-1 p-4">
                <h2 className="mb-3 font-bold">{a.titulo}</h2>
                <ul className="space-y-2">
                  {a.passos.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 font-bold text-primaria" aria-hidden>✔</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
              {ehTI && (
                <div className="flex justify-end gap-3 border-t border-borda px-4 py-2 text-sm">
                  <button type="button" className="font-semibold text-primaria hover:underline" onClick={() => setEditando(a)}>Editar</button>
                  <button type="button" className="font-semibold text-red-700 hover:underline" onClick={() => excluir(a)}>Excluir</button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <Modal titulo={editando?.id ? 'Editar artigo' : 'Novo artigo'} aberto={editando !== null} onFechar={fechar}>
        {editando !== null && <FormArtigo inicial={editando} onCancelar={fechar} onSalvo={() => { fechar(); carregar(); }} />}
      </Modal>
    </>
  );
}
