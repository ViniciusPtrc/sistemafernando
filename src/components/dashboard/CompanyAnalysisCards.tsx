import { Award, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import type { CompanyMetrics } from '@/types';
import { Card } from '@/components/ui/Card';
import { CompanyAvatar } from '@/components/ui/CompanyAvatar';
import { companies as todasEmpresas } from '@/mock/companies';
import { formatCurrency, formatPercent } from '@/utils/format';

interface Badge {
  label: string;
  icone: typeof Award;
  cor: string;
}

export function CompanyAnalysisCards({ empresas }: { empresas: CompanyMetrics[] }) {
  if (empresas.length === 0) return null;

  const melhorSaldo = empresas.reduce((melhor, atual) => (atual.saldoProjetado > melhor.saldoProjetado ? atual : melhor));
  const maiorRecebimento = empresas.reduce((melhor, atual) => (atual.recebido > melhor.recebido ? atual : melhor));
  const maiorPagamento = empresas.reduce((melhor, atual) => (atual.pago > melhor.pago ? atual : melhor));
  const maiorInadimplencia = empresas.reduce((pior, atual) => (atual.taxaInadimplencia > pior.taxaInadimplencia ? atual : pior));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {empresas.map((empresa) => {
        const companyRef = todasEmpresas.find((c) => c.id === empresa.companyId);
        if (!companyRef) return null;

        const badges: Badge[] = [];
        if (empresa.companyId === melhorSaldo.companyId) {
          badges.push({ label: 'Melhor saldo', icone: Award, cor: 'bg-positive-50 text-positive-700' });
        }
        if (empresa.companyId === maiorRecebimento.companyId) {
          badges.push({ label: 'Maior recebimento', icone: TrendingUp, cor: 'bg-brand-50 text-brand-700' });
        }
        if (empresa.companyId === maiorPagamento.companyId) {
          badges.push({ label: 'Maior pagamento', icone: TrendingDown, cor: 'bg-warning-50 text-warning-600' });
        }
        if (empresa.companyId === maiorInadimplencia.companyId && empresa.taxaInadimplencia > 0) {
          badges.push({ label: 'Maior inadimplência', icone: AlertTriangle, cor: 'bg-negative-50 text-negative-700' });
        }

        return (
          <Card key={empresa.companyId} className="p-5">
            <div className="flex items-center gap-2.5">
              <CompanyAvatar company={companyRef} />
              <h3 className="text-sm font-semibold text-graphite-900">{empresa.companyName}</h3>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-graphite-500">Contas a Receber</p>
                <p className="mt-0.5 text-sm font-semibold text-graphite-900">{formatCurrency(empresa.aReceber)}</p>
              </div>
              <div>
                <p className="text-xs text-graphite-500">Contas a Pagar</p>
                <p className="mt-0.5 text-sm font-semibold text-graphite-900">{formatCurrency(empresa.aPagar)}</p>
              </div>
              <div>
                <p className="text-xs text-graphite-500">Saldo</p>
                <p
                  className={`mt-0.5 text-sm font-semibold ${
                    empresa.saldoProjetado >= 0 ? 'text-positive-600' : 'text-negative-600'
                  }`}
                >
                  {formatCurrency(empresa.saldoProjetado)}
                </p>
              </div>
              <div>
                <p className="text-xs text-graphite-500">Inadimplência</p>
                <p className="mt-0.5 text-sm font-semibold text-graphite-900">{formatPercent(empresa.taxaInadimplencia)}</p>
              </div>
            </div>

            {badges.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {badges.map((badge) => (
                  <span
                    key={badge.label}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${badge.cor}`}
                  >
                    <badge.icone className="h-3 w-3" />
                    {badge.label}
                  </span>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
