import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../contexto.jsx';
import { Cabecalho, Campo, Carregando, Erro, Modal } from '../components/ui.jsx';

const PERFIS = [
  { id: 'usuario', nome: 'Usuário', descricao: 'Abre e acompanha os próprios chamados' },
  { id: 'tecnico', nome: 'Técnico', descricao: 'Atende chamados, vê painel e dashboard' },
  { id: 'admin', nome: 'Administrador', descricao: 'Tudo do técnico + gerencia usuários' },
];
const nomePerfil = (id) => PERFIS.find((p) => p.id === id)?.nome ?? id;

function FormUsuario({ inicial, onSalvo, onCancelar }) {
  const { catalogo, carregarCatalogo } = useApp();
  const novo = !inicial?.id;
  const [form, setForm] = useState({
    nome: inicial?.nome ?? '', email: inicial?.email ?? '', perfil: inicial?.perfil ?? 'usuario',
    setor: inicial?.setor ?? '', ramal: inicial?.ramal ?? '', ativo: inicial?.ativo ?? true, senha: '',
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const salvar = async (e) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      if (novo) await api('/usuarios', { method: 'POST', body: form });
      else await api(`/usuarios/${inicial.id}`, { method: 'PUT', body: form });
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
        <Campo rotulo="Nome *" className="sm:col-span-2"><input className="campo" value={form.nome} onChange={set('nome')} required maxLength={120} /></Campo>
        <Campo rotulo="E-mail *" className="sm:col-span-2"><input type="email" className="campo" value={form.email} onChange={set('email')} required maxLength={160} /></Campo>
        <Campo rotulo="Setor">
          <input className="campo" list="setores-usuario" value={form.setor} onChange={set('setor')} maxLength={80} />
          <datalist id="setores-usuario">{catalogo.setores.map((s) => <option key={s} value={s} />)}</datalist>
        </Campo>
        <Campo rotulo="Ramal"><input className="campo" value={form.ramal} onChange={set('ramal')} maxLength={20} /></Campo>
        <Campo rotulo={novo ? 'Senha *' : 'Nova senha'} dica={novo ? 'Mínimo de 6 caracteres.' : 'Deixe em branco para manter a atual.'} className="sm:col-span-2">
          <input type="password" className="campo" value={form.senha} onChange={set('senha')} required={novo} minLength={6} autoComplete="new-password" />
        </Campo>
      </div>
      <fieldset>
        <legend className="rotulo">Perfil</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {PERFIS.map((p) => (
            <label key={p.id} className={`cursor-pointer rounded-lg border-2 p-3 ${form.perfil === p.id ? 'border-primaria bg-primaria-clara' : 'border-borda'}`}>
              <input type="radio" name="perfil" value={p.id} checked={form.perfil === p.id} onChange={set('perfil')} className="sr-only" />
              <span className="block text-sm font-bold">{p.nome}</span>
              <span className="block text-xs text-texto-suave">{p.descricao}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-primaria" checked={form.ativo} onChange={set('ativo')} />
        Usuário ativo (pode fazer login)
      </label>
      <div className="flex justify-end gap-2 border-t border-borda pt-4">
        <button type="button" className="btn-secundario" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn-primario" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
      </div>
    </form>
  );
}

export default function Usuarios() {
  const [lista, setLista] = useState(null);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => api('/usuarios').then(setLista).catch((e) => setErro(e.message)), []);
  useEffect(() => { carregar(); }, [carregar]);
  const fechar = useCallback(() => setEditando(null), []);

  return (
    <>
      <Cabecalho titulo="Usuários" subtitulo="Perfis: Usuário, Técnico e Administrador.">
        <button type="button" className="btn-destaque" onClick={() => setEditando({})}>+ Novo usuário</button>
      </Cabecalho>
      <Erro>{erro}</Erro>

      <section className="cartao overflow-hidden">
        {!lista ? <Carregando /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-primaria text-left text-fundo">
                <tr>{['Nome', 'E-mail', 'Perfil', 'Setor', 'Ramal', 'Situação', ''].map((c) => <th key={c} className="px-3 py-2.5 font-semibold">{c}</th>)}</tr>
              </thead>
              <tbody>
                {lista.map((u) => (
                  <tr key={u.id} className={`border-b border-borda last:border-0 hover:bg-superficie/70 ${u.ativo ? '' : 'text-texto-suave'}`}>
                    <td className="px-3 py-2.5 font-semibold">{u.nome}</td>
                    <td className="px-3 py-2.5">{u.email}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        u.perfil === 'admin' ? 'bg-primaria text-fundo' : u.perfil === 'tecnico' ? 'bg-destaque-claro text-destaque-escuro' : 'bg-superficie text-texto-suave'}`}>
                        {nomePerfil(u.perfil)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{u.setor ?? '—'}</td>
                    <td className="px-3 py-2.5">{u.ramal ?? '—'}</td>
                    <td className="px-3 py-2.5">{u.ativo ? '🟢 Ativo' : '⚪ Inativo'}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button type="button" className="font-semibold text-primaria hover:underline" onClick={() => setEditando(u)}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal titulo={editando?.id ? 'Editar usuário' : 'Novo usuário'} aberto={editando !== null} onFechar={fechar} largura="max-w-xl">
        {editando !== null && <FormUsuario inicial={editando} onCancelar={fechar} onSalvo={() => { fechar(); carregar(); }} />}
      </Modal>
    </>
  );
}
