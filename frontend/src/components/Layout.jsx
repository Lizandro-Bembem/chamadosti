import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../contexto.jsx';
import Notificacoes from './Notificacoes.jsx';
import TrocarSenha from './TrocarSenha.jsx';

const PERFIS = { usuario: 'Usuário', tecnico: 'Técnico', admin: 'Administrador' };

function menu({ ehTI, ehAdmin }) {
  const itens = [];
  if (ehTI) itens.push({ para: '/painel', texto: 'Painel do técnico', icone: '🧰' });
  itens.push({ para: '/chamados', texto: ehTI ? 'Chamados' : 'Meus chamados', icone: '🎫', fim: true });
  if (ehTI) {
    itens.push({ para: '/dashboard', texto: 'Dashboard', icone: '📊' });
    itens.push({ para: '/equipamentos', texto: 'Equipamentos', icone: '💻' });
  }
  itens.push({ para: '/base-conhecimento', texto: 'Base de conhecimento', icone: '📚' });
  if (ehAdmin) itens.push({ para: '/usuarios', texto: 'Usuários', icone: '👥' });
  return itens;
}

export function Logo({ claro = true }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-lg bg-fundo/10 ring-1 ring-fundo/25">
        <svg viewBox="0 0 32 32" className="size-6" aria-hidden>
          <path d="M8 10h16v10H8z" fill="none" stroke={claro ? '#FEFEFD' : '#075930'} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M12.5 24h7M16 20v4" stroke={claro ? '#FEFEFD' : '#075930'} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="24.5" cy="8.5" r="3.6" fill="#FE7C00" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className={`block text-lg font-extrabold tracking-tight ${claro ? 'text-fundo' : 'text-primaria'}`}>Chamados TI</span>
        <span className={`block text-[10px] font-semibold uppercase tracking-[0.2em] ${claro ? 'text-fundo/70' : 'text-texto-suave'}`}>Help Desk TI</span>
      </span>
    </span>
  );
}

export default function Layout() {
  const app = useApp();
  const { usuario, sair } = app;
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [trocarSenha, setTrocarSenha] = useState(false);
  const local = useLocation();
  const itens = menu(app);

  const classeLink = ({ isActive }) => `flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-primaria-clara text-primaria' : 'text-texto-suave hover:bg-superficie hover:text-texto'
  }`;

  return (
    <div className="min-h-screen">
      {/* Marca d'água gigante e translúcida ao fundo */}
      <span className="pointer-events-none fixed right-0 bottom-0 -z-10 translate-x-[6%] translate-y-[18%] -rotate-6 text-[18vw] leading-none font-black whitespace-nowrap text-primaria/[0.035] select-none" aria-hidden>
        Chamados TI
      </span>
      <header className="sticky top-0 z-40 bg-primaria text-fundo shadow-md">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-3 px-4">
          <Link to="/" aria-label="Início"><Logo /></Link>
          <div className="flex items-center gap-2">
            <Link to="/chamados/novo" className="btn-destaque hidden sm:inline-flex">
              <span className="text-base leading-none">+</span> Novo Chamado
            </Link>
            <Notificacoes />
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuUsuario((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-fundo/10"
                aria-expanded={menuUsuario}
              >
                <span className="grid size-8 place-items-center rounded-full bg-destaque text-sm font-bold text-white">
                  {usuario.nome.charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-left leading-tight md:block">
                  <span className="block text-sm font-semibold">{usuario.nome}</span>
                  <span className="block text-xs text-fundo/70">{PERFIS[usuario.perfil]}</span>
                </span>
              </button>
              {menuUsuario && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuUsuario(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right animate-surgir overflow-hidden rounded-xl border border-borda bg-fundo text-texto shadow-lg">
                    <div className="border-b border-borda px-4 py-3">
                      <p className="text-sm font-semibold">{usuario.nome}</p>
                      <p className="truncate text-xs text-texto-suave">{usuario.email}</p>
                    </div>
                    <button type="button" className="block w-full px-4 py-2.5 text-left text-sm hover:bg-superficie"
                      onClick={() => { setMenuUsuario(false); setTrocarSenha(true); }}>
                      Trocar senha
                    </button>
                    <button type="button" className="block w-full px-4 py-2.5 text-left text-sm text-red-700 hover:bg-red-50" onClick={sair}>
                      Sair
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] flex-col lg:flex-row">
        <nav className="sticky top-16 z-30 border-b border-borda bg-fundo lg:h-[calc(100vh-4rem)] lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
          <div className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:p-4">
            <Link to="/chamados/novo" className="btn-destaque mb-0 shrink-0 sm:hidden">+ Novo</Link>
            {itens.map((i) => (
              <NavLink key={i.para} to={i.para} end={i.fim} className={classeLink}>
                <span aria-hidden>{i.icone}</span>{i.texto}
              </NavLink>
            ))}
          </div>
        </nav>
        <main key={local.pathname} className="relative min-w-0 flex-1 animate-entrar px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <TrocarSenha aberto={trocarSenha} onFechar={() => setTrocarSenha(false)} />
    </div>
  );
}
