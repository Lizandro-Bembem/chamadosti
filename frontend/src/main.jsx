import { StrictMode, Suspense, lazy, useCallback, useState } from 'react';
import Splash, { deveMostrarSplash } from './components/Splash.jsx';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import { AppProvider, useApp } from './contexto.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Chamados from './pages/Chamados.jsx';
import NovoChamado from './pages/NovoChamado.jsx';
import ChamadoDetalhe from './pages/ChamadoDetalhe.jsx';
import Painel from './pages/Painel.jsx';
import Equipamentos from './pages/Equipamentos.jsx';
import BaseConhecimento from './pages/BaseConhecimento.jsx';
import Usuarios from './pages/Usuarios.jsx';
import { Carregando } from './components/ui.jsx';

// O dashboard usa a biblioteca de gráficos: só é carregado quando a página é aberta.
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));

function SoTI({ children }) {
  const { ehTI } = useApp();
  return ehTI ? children : <Navigate to="/chamados" replace />;
}

function SoAdmin({ children }) {
  const { ehAdmin } = useApp();
  return ehAdmin ? children : <Navigate to="/" replace />;
}

function Aplicacao() {
  const [splash, setSplash] = useState(deveMostrarSplash);
  const fimSplash = useCallback(() => setSplash(false), []);
  return (
    <>
      {splash && <Splash onFim={fimSplash} />}
      <Rotas />
    </>
  );
}

function Rotas() {
  const { usuario, catalogo, carregando, ehTI } = useApp();

  if (carregando) return <Carregando tela />;
  if (!usuario || !catalogo) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to={ehTI ? '/painel' : '/chamados'} replace />} />
        <Route path="chamados" element={<Chamados />} />
        <Route path="chamados/novo" element={<NovoChamado />} />
        <Route path="chamados/:id" element={<ChamadoDetalhe />} />
        <Route path="painel" element={<SoTI><Painel /></SoTI>} />
        <Route path="dashboard" element={<SoTI><Suspense fallback={<Carregando />}><Dashboard /></Suspense></SoTI>} />
        <Route path="equipamentos" element={<SoTI><Equipamentos /></SoTI>} />
        <Route path="base-conhecimento" element={<BaseConhecimento />} />
        <Route path="usuarios" element={<SoAdmin><Usuarios /></SoAdmin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <Aplicacao />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
);
