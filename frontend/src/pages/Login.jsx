import { useState } from 'react';
import { useApp } from '../contexto.jsx';
import { Logo } from '../components/Layout.jsx';
import { Erro } from '../components/ui.jsx';
import CartaoChamado3D from '../components/CartaoChamado3D.jsx';

export default function Login() {
  const { entrar } = useApp();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-primaria p-12 text-fundo lg:flex lg:flex-col lg:justify-between">
        {/* Marca d'água gigante ao fundo */}
        <span className="splash-marca-dagua pointer-events-none absolute top-1/2 -left-10 -translate-y-1/2 text-[17vw] leading-none font-black whitespace-nowrap text-fundo/[0.045] select-none" aria-hidden>
          HELP DESK
        </span>
        <div className="relative animate-entrar"><Logo /></div>
        <div className="relative z-10 grid gap-10 xl:grid-cols-[1fr_auto] xl:items-center">
          <div className="max-w-md animate-entrar [animation-delay:120ms]">
            <h1 className="text-4xl leading-tight font-extrabold">
              Suporte de TI <span className="text-destaque">rápido</span> e organizado.
            </h1>
            <p className="mt-4 text-lg text-fundo/80">
              Abra chamados, acompanhe o atendimento e resolva problemas comuns com o assistente inteligente.
            </p>
          </div>
          <div className="animate-surgir [animation-delay:300ms]">
            <CartaoChamado3D />
          </div>
        </div>
        <p className="relative text-sm text-fundo/60">Chamados TI · Help Desk interno</p>
        <div className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full border-[48px] border-fundo/5" />
      </section>

      <section className="flex items-center justify-center bg-fundo p-6">
        <form onSubmit={enviar} className="w-full max-w-sm animate-entrar space-y-5 [animation-delay:200ms]">
          <div className="mb-8 rounded-xl bg-primaria p-4 lg:hidden"><Logo /></div>
          <div>
            <h2 className="text-2xl font-bold text-primaria">Entrar</h2>
            <p className="mt-1 text-sm text-texto-suave">Use seu e-mail e senha da empresa.</p>
          </div>
          <Erro>{erro}</Erro>
          <label className="block">
            <span className="rotulo">E-mail</span>
            <input type="email" className="campo" value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="username" required autoFocus />
          </label>
          <label className="block">
            <span className="rotulo">Senha</span>
            <input type="password" className="campo" value={senha} onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password" required />
          </label>
          <button type="submit" className="btn-primario w-full py-2.5" disabled={enviando}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>
          <p className="text-center text-xs text-texto-suave">Esqueceu a senha? Fale com a equipe de TI.</p>
        </form>
      </section>
    </div>
  );
}
