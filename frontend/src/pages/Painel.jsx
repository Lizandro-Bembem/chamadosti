import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../contexto.jsx';
import ChamadoLinha from '../components/ChamadoLinha.jsx';
import { Cabecalho, Carregando, Erro, Vazio } from '../components/ui.jsx';
import { useContagem, useInclinar } from '../components/animacao.jsx';

export function Contador({ rotulo, valor: valorFinal, destaque = false, alerta = false, para, indice = 0 }) {
  const valor = useContagem(valorFinal);
  const inclinar = useInclinar(10);
  const conteudo = (
    <>
      <span className={`block text-sm font-medium ${destaque ? 'text-fundo/80' : 'text-texto-suave'}`}>{rotulo}</span>
      <span className={`mt-1 block font-extrabold whitespace-nowrap tabular-nums ${String(valor).length > 5 ? 'text-2xl leading-10' : 'text-4xl'} ${
        destaque ? 'text-fundo' : alerta && valor > 0 ? 'text-red-700' : 'text-primaria'}`}>{valor}</span>
    </>
  );
  const classe = `escalonado inclinar block rounded-xl border p-4 ${
    destaque ? 'brilho border-primaria bg-primaria' : 'border-borda bg-fundo hover:border-primaria/40'}`;
  const props = { className: classe, style: { '--i': indice }, ...inclinar };
  return para ? <Link to={para} {...props}>{conteudo}</Link> : <div {...props}>{conteudo}</div>;
}

function Lista({ titulo, itens, vazio, acao }) {
  return (
    <section className="cartao overflow-hidden">
      <div className="flex items-center justify-between border-b border-borda px-4 py-3">
        <h2 className="text-sm font-bold tracking-wide text-primaria uppercase">{titulo}</h2>
        <span className="rounded-full bg-superficie px-2 py-0.5 text-xs font-semibold text-texto-suave">{itens.length}</span>
      </div>
      {itens.length === 0 ? <Vazio icone="✨" titulo={vazio} /> : (
        <ul className="@container">{itens.map((c, i) => <ChamadoLinha key={c.id} chamado={c} indice={i} acao={acao?.(c)} />)}</ul>
      )}
    </section>
  );
}

export default function Painel() {
  const { usuario } = useApp();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [assumindo, setAssumindo] = useState(null);

  const carregar = useCallback(() => api('/indicadores/painel')
    .then((d) => { setDados(d); setErro(''); })
    .catch((e) => setErro(e.message)), []);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 30000);
    return () => clearInterval(t);
  }, [carregar]);

  const assumir = async (id) => {
    setAssumindo(id);
    try {
      await api(`/chamados/${id}/assumir`, { method: 'POST' });
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setAssumindo(null);
    }
  };

  if (!dados) return erro ? <Erro>{erro}</Erro> : <Carregando />;
  const c = dados.contagens;

  return (
    <>
      <Cabecalho titulo="Painel do técnico" subtitulo={`Olá, ${usuario.nome.split(' ')[0]}! Este é o resumo de hoje.`}>
        <Link to="/chamados" className="btn-secundario">Todos os chamados</Link>
      </Cabecalho>
      <Erro>{erro}</Erro>

      <h2 className="mb-3 text-sm font-bold tracking-wide text-texto-suave uppercase">Chamados hoje</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Contador indice={0} rotulo="Abertos" valor={c.abertos} destaque para="/chamados?status=aberto" />
        <Contador indice={1} rotulo="Em atendimento" valor={c.em_atendimento} para="/chamados?status=em_atendimento" />
        <Contador indice={2} rotulo="Resolvidos hoje" valor={c.resolvidos_hoje} />
        <Contador indice={3} rotulo="Pendentes" valor={c.pendentes} />
        <Contador indice={4} rotulo="SLA vencido" valor={c.sla_vencido} alerta />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Lista titulo="Meus chamados" itens={dados.meus} vazio="Você não tem chamados em andamento." />
        <Lista
          titulo="Fila sem técnico"
          itens={dados.fila}
          vazio="Nenhum chamado aguardando técnico."
          acao={(ch) => (
            <button type="button" className="btn-destaque px-3 py-1.5 text-xs" disabled={assumindo === ch.id} onClick={() => assumir(ch.id)}>
              {assumindo === ch.id ? '...' : 'Assumir'}
            </button>
          )}
        />
      </div>

      {dados.sla_em_risco.length > 0 && (
        <div className="mt-5">
          <Lista titulo="⏰ SLA vencido ou vencendo na próxima hora" itens={dados.sla_em_risco} vazio="" />
        </div>
      )}
    </>
  );
}
