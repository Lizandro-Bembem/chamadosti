import { cloneElement, useEffect, useLayoutEffect, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis,
} from 'recharts';
import { api } from '../api.js';
import { useApp } from '../contexto.jsx';
import { Cabecalho, Carregando, Erro, Vazio } from '../components/ui.jsx';
import { Contador } from './Painel.jsx';
import { duracao } from '../util.js';

// Uma série por gráfico: cor principal, marcas finas, grade discreta, dica ao passar o mouse.
const COR = '#075930';
const GRADE = '#e4e9e6';
const EIXO = { fontSize: 12, fill: '#55625a' };

function DicaGrafico({ active, payload, label, formatar = (v) => v, unidade = 'chamado(s)', prefixo = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-borda bg-fundo px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold">{prefixo}{label}</p>
      <p className="text-texto-suave"><span className="font-bold text-texto tabular-nums">{formatar(payload[0].value)}</span> {unidade}</p>
    </div>
  );
}

/** Mede a largura disponível do contêiner para desenhar o gráfico no tamanho certo. */
function useLargura() {
  const [no, setNo] = useState(null);
  const [largura, setLargura] = useState(0);
  useLayoutEffect(() => {
    if (!no) return undefined;
    const medir = () => setLargura(Math.floor(no.getBoundingClientRect().width));
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(no);
    return () => obs.disconnect();
  }, [no]);
  return [setNo, largura];
}

function Grafico({ titulo, subtitulo, vazio, altura = 280, children, tabela, indice = 0 }) {
  const [verTabela, setVerTabela] = useState(false);
  const [refArea, largura] = useLargura();
  return (
    <section className="cartao escalonado p-5" style={{ '--i': indice }}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">{titulo}</h2>
          {subtitulo && <p className="text-xs text-texto-suave">{subtitulo}</p>}
        </div>
        {!vazio && (
          <button type="button" className="shrink-0 text-xs font-semibold text-primaria hover:underline" onClick={() => setVerTabela((v) => !v)}>
            {verTabela ? 'Ver gráfico' : 'Ver tabela'}
          </button>
        )}
      </div>
      {vazio ? <Vazio icone="📉" titulo="Sem dados no período" /> : verTabela ? (
        <div className="max-h-[280px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-borda text-left text-texto-suave">{tabela.colunas.map((c) => <th key={c} className="py-1.5 font-medium">{c}</th>)}</tr></thead>
            <tbody>{tabela.linhas.map((l) => (
              <tr key={l[0]} className="border-b border-borda/60">{l.map((v, i) => <td key={i} className={`py-1.5 ${i ? 'tabular-nums' : ''}`}>{v}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <div ref={refArea} style={{ height: altura }} className="w-full">
          {largura > 0 && cloneElement(children, { width: largura, height: altura })}
        </div>
      )}
    </section>
  );
}

function BarrasHorizontais({ dados, chave, valor, formatar, unidade, width, height }) {
  return (
    <BarChart width={width} height={height} data={dados} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }} barCategoryGap={6}>
      <CartesianGrid horizontal={false} stroke={GRADE} />
      <XAxis type="number" dataKey={valor} allowDecimals={false} tick={EIXO} axisLine={false} tickLine={false}
        tickFormatter={formatar} />
      <YAxis type="category" dataKey={chave} width={150} tick={EIXO} axisLine={false} tickLine={false} />
      <Tooltip cursor={{ fill: '#07593010' }} content={<DicaGrafico formatar={formatar} unidade={unidade} />} />
      <Bar dataKey={valor} fill={COR} radius={[0, 4, 4, 0]} maxBarSize={22} animationDuration={900} animationEasing="ease-out" />
    </BarChart>
  );
}

const mesAtual = () => new Date().toLocaleDateString('sv-SE').slice(0, 7);

export default function Dashboard() {
  const { categoria } = useApp();
  const [mes, setMes] = useState(mesAtual());
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    setDados(null);
    setErro('');
    api(`/indicadores/dashboard?mes=${mes}`)
      .then((d) => ativo && setDados(d))
      .catch((e) => ativo && setErro(e.message));
    return () => { ativo = false; };
  }, [mes]);

  const nomeMes = new Date(`${mes}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  if (!dados) return erro ? <Erro>{erro}</Erro> : <Carregando />;
  const { contagens: c, resumo: r } = dados;
  const porCategoria = dados.por_categoria.map((d) => ({ ...d, nome: `${categoria(d.categoria).icone} ${categoria(d.categoria).nome}` }));
  const tempoTecnico = dados.por_tecnico.filter((t) => t.tempo_medio_min !== null);

  return (
    <>
      <Cabecalho titulo="Dashboard" subtitulo={`Indicadores de ${nomeMes}`}>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-texto-suave">Mês</span>
          <input type="month" className="campo w-auto" value={mes} max={mesAtual()} onChange={(e) => e.target.value && setMes(e.target.value)} />
        </label>
      </Cabecalho>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Contador indice={0} rotulo="Abertos" valor={c.abertos} destaque />
        <Contador indice={1} rotulo="Em atendimento" valor={c.em_atendimento} />
        <Contador indice={2} rotulo="Resolvidos hoje" valor={c.resolvidos_hoje} />
        <Contador indice={3} rotulo="Chamados no mês" valor={r.total_mes} />
        <Contador indice={4} rotulo="Tempo médio" valor={duracao(r.tempo_medio_min)} />
        <Contador indice={5} rotulo="SLA cumprido" valor={r.sla_cumprido_pct === null ? '—' : `${r.sla_cumprido_pct}%`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="xl:col-span-2">
          <Grafico titulo="Chamados do mês" subtitulo="Chamados abertos por dia" altura={240}
            vazio={r.total_mes === 0}
            tabela={{ colunas: ['Dia', 'Chamados'], linhas: dados.por_dia.map((d) => [d.dia, d.total]) }}>
            <AreaChart data={dados.por_dia} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="preenchimento" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COR} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={COR} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={GRADE} />
              <XAxis dataKey="dia" tick={EIXO} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
              <YAxis allowDecimals={false} tick={EIXO} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ stroke: COR, strokeDasharray: '3 3' }}
                content={<DicaGrafico prefixo="Dia " />} />
              <Area type="linear" dataKey="total" animationDuration={1200} animationEasing="ease-out" stroke={COR} strokeWidth={2} fill="url(#preenchimento)"
                dot={false} activeDot={{ r: 5, fill: COR, stroke: '#FEFEFD', strokeWidth: 2 }} />
            </AreaChart>
          </Grafico>
        </div>

        <Grafico titulo="Chamados por categoria" altura={Math.max(200, porCategoria.length * 30)} vazio={porCategoria.length === 0}
          tabela={{ colunas: ['Categoria', 'Chamados'], linhas: porCategoria.map((d) => [d.nome, d.total]) }}>
          <BarrasHorizontais dados={porCategoria} chave="nome" valor="total" />
        </Grafico>

        <Grafico titulo="Chamados por setor" altura={Math.max(200, dados.por_setor.length * 34)} vazio={dados.por_setor.length === 0}
          tabela={{ colunas: ['Setor', 'Chamados'], linhas: dados.por_setor.map((d) => [d.setor, d.total]) }}>
          <BarrasHorizontais dados={dados.por_setor} chave="setor" valor="total" />
        </Grafico>

        <Grafico titulo="Chamados por técnico" altura={Math.max(160, dados.por_tecnico.length * 40)} vazio={dados.por_tecnico.length === 0}
          tabela={{
            colunas: ['Técnico', 'Chamados', 'Resolvidos'],
            linhas: dados.por_tecnico.map((t) => [t.tecnico, t.total, t.resolvidos]),
          }}>
          <BarrasHorizontais dados={dados.por_tecnico} chave="tecnico" valor="total" />
        </Grafico>

        <Grafico titulo="Tempo médio de atendimento" subtitulo="Da abertura até a resolução, por técnico"
          altura={Math.max(160, tempoTecnico.length * 40)} vazio={tempoTecnico.length === 0}
          tabela={{ colunas: ['Técnico', 'Tempo médio'], linhas: tempoTecnico.map((t) => [t.tecnico, duracao(t.tempo_medio_min)]) }}>
          <BarrasHorizontais dados={tempoTecnico} chave="tecnico" valor="tempo_medio_min" formatar={duracao} unidade="em média" />
        </Grafico>
      </div>
    </>
  );
}
