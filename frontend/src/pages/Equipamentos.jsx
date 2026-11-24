import { useCallback, useEffect, useState } from 'react';
import { api, qs } from '../api.js';
import { useApp } from '../contexto.jsx';
import { Cabecalho, Campo, Carregando, Erro, Modal, Vazio } from '../components/ui.jsx';

const VAZIO = {
  nome_computador: '', usuario_id: '', setor: '', ip: '', mac: '', patrimonio: '', windows: '', office: '', antivirus: '',
};

function FormEquipamento({ inicial, usuarios, onSalvo, onCancelar }) {
  const { catalogo, carregarCatalogo } = useApp();
  const [form, setForm] = useState(() => ({ ...VAZIO, ...Object.fromEntries(Object.entries(inicial ?? {}).map(([k, v]) => [k, v ?? ''])) }));
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const escolherUsuario = (e) => {
    const id = e.target.value;
    const u = usuarios.find((x) => String(x.id) === id);
    setForm((f) => ({ ...f, usuario_id: id, setor: f.setor || u?.setor || '' }));
  };

  const salvar = async (e) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      const corpo = { ...form, usuario_id: form.usuario_id ? Number(form.usuario_id) : null };
      if (inicial?.id) await api(`/equipamentos/${inicial.id}`, { method: 'PUT', body: corpo });
      else await api('/equipamentos', { method: 'POST', body: corpo });
      carregarCatalogo().catch(() => {});
      onSalvo();
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={salvar} className="space-y-4">
      <Erro>{erro}</Erro>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome do computador *"><input className="campo" value={form.nome_computador} onChange={set('nome_computador')} required maxLength={80} placeholder="Ex.: FIN-PC01" /></Campo>
        <Campo rotulo="Patrimônio *"><input className="campo" value={form.patrimonio} onChange={set('patrimonio')} required maxLength={40} placeholder="Ex.: PAT-1001" /></Campo>
        <Campo rotulo="Usuário">
          <select className="campo" value={form.usuario_id} onChange={escolherUsuario}>
            <option value="">— Sem usuário —</option>
            {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}{u.setor ? ` (${u.setor})` : ''}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Setor">
          <input className="campo" list="setores-equip" value={form.setor} onChange={set('setor')} maxLength={80} />
          <datalist id="setores-equip">{catalogo.setores.map((s) => <option key={s} value={s} />)}</datalist>
        </Campo>
        <Campo rotulo="IP"><input className="campo font-mono" value={form.ip} onChange={set('ip')} maxLength={45} placeholder="192.168.1.10" /></Campo>
        <Campo rotulo="MAC"><input className="campo font-mono" value={form.mac} onChange={set('mac')} maxLength={17} placeholder="00:00:00:00:00:00" /></Campo>
        <Campo rotulo="Windows"><input className="campo" value={form.windows} onChange={set('windows')} maxLength={60} placeholder="Windows 11 Pro" /></Campo>
        <Campo rotulo="Office"><input className="campo" value={form.office} onChange={set('office')} maxLength={60} placeholder="Microsoft 365" /></Campo>
        <Campo rotulo="Antivírus" className="sm:col-span-2"><input className="campo" value={form.antivirus} onChange={set('antivirus')} maxLength={60} placeholder="Windows Defender" /></Campo>
      </div>
      <div className="flex justify-end gap-2 border-t border-borda pt-4">
        <button type="button" className="btn-secundario" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn-primario" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
      </div>
    </form>
  );
}

export default function Equipamentos() {
  const [lista, setLista] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState(null); // null = fechado | {} = novo | equipamento
  const [erro, setErro] = useState('');

  const carregar = useCallback((termo) => api(`/equipamentos${qs({ busca: termo })}`).then(setLista).catch((e) => setErro(e.message)), []);

  useEffect(() => {
    const t = setTimeout(() => carregar(busca), 300);
    return () => clearTimeout(t);
  }, [busca, carregar]);

  useEffect(() => { api('/usuarios/resumo').then(setUsuarios).catch(() => {}); }, []);

  const excluir = async (eq) => {
    if (!window.confirm(`Excluir o equipamento ${eq.nome_computador} (${eq.patrimonio})?`)) return;
    try {
      await api(`/equipamentos/${eq.id}`, { method: 'DELETE' });
      carregar(busca);
    } catch (e) {
      setErro(e.message);
    }
  };

  const fechar = useCallback(() => setEditando(null), []);

  return (
    <>
      <Cabecalho titulo="Equipamentos" subtitulo="Cadastro dos computadores. Ao abrir um chamado com o patrimônio, esses dados aparecem automaticamente.">
        <button type="button" className="btn-destaque" onClick={() => setEditando({})}>+ Novo equipamento</button>
      </Cabecalho>

      <div className="mb-4 max-w-md">
        <input type="search" className="campo" placeholder="Pesquisar por nome, patrimônio, IP, setor ou usuário" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      <Erro>{erro}</Erro>

      <section className="cartao overflow-hidden">
        {!lista && <Carregando />}
        {lista?.length === 0 && <Vazio icone="💻" titulo="Nenhum equipamento encontrado" />}
        {lista?.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-primaria text-left text-fundo">
                <tr>{['Computador', 'Patrimônio', 'Usuário', 'Setor', 'IP', 'MAC', 'Windows', 'Office', 'Antivírus', ''].map((c) => (
                  <th key={c} className="px-3 py-2.5 font-semibold">{c}</th>
                ))}</tr>
              </thead>
              <tbody>
                {lista.map((e) => (
                  <tr key={e.id} className="border-b border-borda last:border-0 hover:bg-superficie/70">
                    <td className="px-3 py-2.5 font-semibold text-primaria">{e.nome_computador}</td>
                    <td className="px-3 py-2.5 font-mono">{e.patrimonio}</td>
                    <td className="px-3 py-2.5">{e.usuario_nome ?? '—'}</td>
                    <td className="px-3 py-2.5">{e.setor ?? '—'}</td>
                    <td className="px-3 py-2.5 font-mono">{e.ip ?? '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{e.mac ?? '—'}</td>
                    <td className="px-3 py-2.5">{e.windows ?? '—'}</td>
                    <td className="px-3 py-2.5">{e.office ?? '—'}</td>
                    <td className="px-3 py-2.5">{e.antivirus ?? '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right">
                      <button type="button" className="mr-3 font-semibold text-primaria hover:underline" onClick={() => setEditando(e)}>Editar</button>
                      <button type="button" className="font-semibold text-red-700 hover:underline" onClick={() => excluir(e)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal titulo={editando?.id ? 'Editar equipamento' : 'Novo equipamento'} aberto={editando !== null} onFechar={fechar} largura="max-w-2xl">
        {editando !== null && (
          <FormEquipamento inicial={editando} usuarios={usuarios} onCancelar={fechar}
            onSalvo={() => { fechar(); carregar(busca); }} />
        )}
      </Modal>
    </>
  );
}
