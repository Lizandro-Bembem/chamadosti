import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useApp } from '../contexto.jsx';
import ChamadoLinha from '../components/ChamadoLinha.jsx';
import { Cabecalho, Carregando, Erro, Vazio } from '../components/ui.jsx';

const FILTROS_VAZIOS = {
  busca: '', nome: '', setor: '', categoria: '', tecnico: '', status: 'abertos', prioridade: '', data_inicio: '', data_fim: '',
};

export default function Chamados() {
  const { ehTI, catalogo } = useApp();
  const [params, setParams] = useSearchParams();
  const filtros = { ...FILTROS_VAZIOS, ...Object.fromEntries(params) };
  const [chamados, setChamados] = useState(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState(filtros.busca);
  const chave = params.toString();

  useEffect(() => {
    let ativo = true;
    setChamados(null);
    setErro('');
    api(`/chamados${qs({ ...FILTROS_VAZIOS, ...Object.fromEntries(new URLSearchParams(chave)) })}`)
      .then((d) => ativo && setChamados(d))
      .catch((e) => ativo && setErro(e.message));
    return () => { ativo = false; };
  }, [chave]);

  // Busca por texto com pequeno atraso para não consultar a cada tecla
  useEffect(() => {
    const t = setTimeout(() => {
      if (busca !== filtros.busca) alterar('busca', busca);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  function alterar(campo, valor) {
    const novo = new URLSearchParams(params);
    if (valor === '' && campo !== 'status') novo.delete(campo);
    else novo.set(campo, valor);
    setParams(novo, { replace: true });
  }

  const limpar = () => { setBusca(''); setParams({}, { replace: true }); };
  const filtrosAtivos = Object.entries(filtros).filter(([k, v]) => v !== FILTROS_VAZIOS[k]).length;

  const select = (campo, rotulo, opcoes) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-texto-suave">{rotulo}</span>
      <select className="campo" value={filtros[campo]} onChange={(e) => alterar(campo, e.target.value)}>
        {opcoes.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  );

  return (
    <>
      <Cabecalho
        titulo={ehTI ? 'Chamados' : 'Meus chamados'}
        subtitulo={filtros.status === 'abertos' ? 'Chamados abertos' : 'Resultado da pesquisa'}
      >
        <Link to="/chamados/novo" className="btn-destaque">+ Novo Chamado</Link>
      </Cabecalho>

      <section className="cartao mb-5 p-4" aria-label="Filtros">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-texto-suave">Pesquisar</span>
            <input type="search" className="campo" placeholder="Nº, descrição, nome ou patrimônio" value={busca}
              onChange={(e) => setBusca(e.target.value)} />
          </label>
          {ehTI && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-texto-suave">Nome do usuário</span>
              <input className="campo" value={filtros.nome} onChange={(e) => alterar('nome', e.target.value)} placeholder="Ex.: Maria" />
            </label>
          )}
          {select('status', 'Status', [['abertos', 'Em aberto (todos)'], ['', 'Todos'], ...catalogo.status.map((s) => [s.id, s.nome])])}
          {select('categoria', 'Categoria', [['', 'Todas'], ...catalogo.categorias.map((c) => [c.id, `${c.icone} ${c.nome}`])])}
          {ehTI && select('setor', 'Setor', [['', 'Todos'], ...catalogo.setores.map((s) => [s, s])])}
          {ehTI && select('tecnico', 'Técnico', [['', 'Todos'], ['nenhum', 'Sem técnico'], ...catalogo.tecnicos.map((t) => [String(t.id), t.nome])])}
          {select('prioridade', 'Prioridade', [['', 'Todas'], ...catalogo.prioridades.map((p) => [p.id, p.nome])])}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-texto-suave">De</span>
            <input type="date" className="campo" value={filtros.data_inicio} onChange={(e) => alterar('data_inicio', e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-texto-suave">Até</span>
            <input type="date" className="campo" value={filtros.data_fim} onChange={(e) => alterar('data_fim', e.target.value)} />
          </label>
        </div>
        {filtrosAtivos > 0 && (
          <button type="button" onClick={limpar} className="mt-3 text-sm font-semibold text-primaria hover:underline">
            Limpar filtros ({filtrosAtivos})
          </button>
        )}
      </section>

      <Erro>{erro}</Erro>
      <section className="cartao overflow-hidden">
        <div className="flex items-center justify-between border-b border-borda bg-primaria px-4 py-2.5 text-fundo">
          <h2 className="text-sm font-bold tracking-wide uppercase">
            {filtros.status === 'abertos' ? 'Chamados abertos' : 'Chamados'}
          </h2>
          {chamados && <span className="text-sm text-fundo/80">{chamados.length} encontrado(s)</span>}
        </div>
        {!chamados && !erro && <Carregando />}
        {chamados?.length === 0 && (
          <Vazio titulo="Nenhum chamado encontrado">
            {filtrosAtivos ? 'Tente mudar ou limpar os filtros.' : 'Quando houver chamados, eles aparecem aqui.'}
          </Vazio>
        )}
        {chamados?.length > 0 && (
          <ul className="@container">{chamados.map((c, i) => <ChamadoLinha key={c.id} chamado={c} indice={i} />)}</ul>
        )}
      </section>
    </>
  );
}
