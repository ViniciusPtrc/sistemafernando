import { useEffect, useState } from 'react';
import type { CompanyMetrics } from '@/types';
import { Select } from '@/components/ui/Select';
import { CompanyAvatar } from '@/components/ui/CompanyAvatar';
import { companies as todasEmpresas } from '@/mock/companies';
import { formatCurrency, formatPercent } from '@/utils/format';
import { getCompanyRanking, type OrdenacaoRanking } from '@/services/dashboardService';

const OPCOES_ORDENACAO: { value: OrdenacaoRanking; label: string }[] = [
  { value: 'saldo', label: 'Maior saldo' },
  { value: 'recebido', label: 'Maior faturamento (recebido)' },
  { value: 'aReceber', label: 'Maior contas a receber' },
  { value: 'aPagar', label: 'Maior contas a pagar' },
  { value: 'inadimplencia', label: 'Maior inadimplência' },
];

const VALOR_POR_ORDENACAO: Record<OrdenacaoRanking, (metrics: CompanyMetrics) => string> = {
  saldo: (m) => formatCurrency(m.saldoProjetado),
  recebido: (m) => formatCurrency(m.recebido),
  aReceber: (m) => formatCurrency(m.aReceber),
  aPagar: (m) => formatCurrency(m.aPagar),
  inadimplencia: (m) => formatPercent(m.taxaInadimplencia),
};

export function CompanyRanking() {
  const [ordenarPor, setOrdenarPor] = useState<OrdenacaoRanking>('saldo');
  const [ranking, setRanking] = useState<CompanyMetrics[]>([]);

  useEffect(() => {
    getCompanyRanking(ordenarPor).then(setRanking);
  }, [ordenarPor]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-graphite-900">Ranking das Empresas</h2>
        <div className="w-full sm:w-64">
          <Select
            opcoes={OPCOES_ORDENACAO}
            value={ordenarPor}
            onChange={(event) => setOrdenarPor(event.target.value as OrdenacaoRanking)}
          />
        </div>
      </div>
      <ol className="flex flex-col gap-3">
        {ranking.map((empresa, indice) => {
          const companyRef = todasEmpresas.find((c) => c.id === empresa.companyId);
          if (!companyRef) return null;
          return (
            <li key={empresa.companyId} className="flex items-center gap-3 rounded-lg border border-graphite-200 px-4 py-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-graphite-100 text-xs font-semibold text-graphite-500">
                {indice + 1}
              </span>
              <CompanyAvatar company={companyRef} size="sm" />
              <span className="flex-1 truncate text-sm font-medium text-graphite-800">{empresa.companyName}</span>
              <span className="text-sm font-semibold text-graphite-900">{VALOR_POR_ORDENACAO[ordenarPor](empresa)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
