import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, sessao } from './api.js';

const AppContexto = createContext(null);

export function AppProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [catalogo, setCatalogo] = useState(null);
  const [carregando, setCarregando] = useState(Boolean(sessao.get()));

  const carregarCatalogo = useCallback(async () => {
    setCatalogo(await api('/catalogo'));
  }, []);

  // Devolve a mensagem de erro (ou null se deu certo) para a tela de login poder mostrá-la.
  const iniciar = useCallback(async () => {
    try {
      const eu = await api('/auth/me');
      setUsuario(eu);
      await carregarCatalogo();
      return null;
    } catch (erro) {
      sessao.limpar();
      setUsuario(null);
      setCatalogo(null);
      return erro.message;
    } finally {
      setCarregando(false);
    }
  }, [carregarCatalogo]);

  useEffect(() => {
    if (sessao.get()) iniciar();
    const expirou = () => { setUsuario(null); setCatalogo(null); };
    window.addEventListener('sessao-expirada', expirou);
    return () => window.removeEventListener('sessao-expirada', expirou);
  }, [iniciar]);

  const entrar = useCallback(async (email, senha) => {
    const { token } = await api('/auth/login', { method: 'POST', body: { email, senha } });
    sessao.set(token);
    setCarregando(true);
    const erro = await iniciar();
    if (erro) throw new Error(erro);
  }, [iniciar]);

  const sair = useCallback(() => {
    sessao.limpar();
    setUsuario(null);
    setCatalogo(null);
  }, []);

  const valor = useMemo(() => {
    const busca = (lista, id) => lista?.find((i) => i.id === id);
    return {
      usuario,
      catalogo,
      carregando,
      entrar,
      sair,
      carregarCatalogo,
      ehTI: usuario?.perfil === 'tecnico' || usuario?.perfil === 'admin',
      ehAdmin: usuario?.perfil === 'admin',
      categoria: (id) => busca(catalogo?.categorias, id) ?? { id, nome: id, icone: '❓' },
      nomeStatus: (id) => busca(catalogo?.status, id)?.nome ?? id,
      prioridade: (id) => busca(catalogo?.prioridades, id) ?? { id, nome: id, slaMinutos: 0 },
    };
  }, [usuario, catalogo, carregando, entrar, sair, carregarCatalogo]);

  return <AppContexto.Provider value={valor}>{children}</AppContexto.Provider>;
}

export const useApp = () => useContext(AppContexto);
