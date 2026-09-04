import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { ToastProvider } from '@/hooks/useToast';
import { CompanyProvider } from '@/hooks/useCompany';
import DashboardPage from '@/pages/Dashboard';
import ContasPagarPage from '@/pages/ContasPagar';
import ContasReceberPage from '@/pages/ContasReceber';
import FluxoCaixaPage from '@/pages/FluxoCaixa';
import RelatoriosPage from '@/pages/Relatorios';
import ImportacaoPage from '@/pages/Importacao';
import ConfiguracoesPage from '@/pages/Configuracoes';
import NotFoundPage from '@/pages/NotFound';

export default function App() {
  return (
    <CompanyProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="contas-pagar" element={<ContasPagarPage />} />
              <Route path="contas-receber" element={<ContasReceberPage />} />
              <Route path="fluxo-caixa" element={<FluxoCaixaPage />} />
              <Route path="relatorios" element={<RelatoriosPage />} />
              <Route path="importacao" element={<ImportacaoPage />} />
              <Route path="configuracoes" element={<ConfiguracoesPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </CompanyProvider>
  );
}
