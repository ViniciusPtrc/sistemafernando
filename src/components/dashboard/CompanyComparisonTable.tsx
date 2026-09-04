import type { CompanyMetrics } from '@/types';
import { CompanyAvatar } from '@/components/ui/CompanyAvatar';
import { companies as todasEmpresas } from '@/mock/companies';
import { formatCurrency } from '@/utils/format';

export function CompanyComparisonTable({
  empresas,
  consolidado,
}: {
  empresas: CompanyMetrics[];
  consolidado: CompanyMetrics;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-graphite-200">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-graphite-500">Empresa</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-graphite-500">A Receber</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-graphite-500">A Pagar</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-graphite-500">Recebido</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-graphite-500">Pago</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-graphite-500">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {empresas.map((empresa) => {
            const companyRef = todasEmpresas.find((c) => c.id === empresa.companyId);
            return (
              <tr key={empresa.companyId} className="border-b border-graphite-100 hover:bg-graphite-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {companyRef && <CompanyAvatar company={companyRef} size="sm" />}
                    <span className="font-medium text-graphite-800">{empresa.companyName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-graphite-700">{formatCurrency(empresa.aReceber)}</td>
                <td className="px-4 py-3 text-right text-graphite-700">{formatCurrency(empresa.aPagar)}</td>
                <td className="px-4 py-3 text-right text-positive-600">{formatCurrency(empresa.recebido)}</td>
                <td className="px-4 py-3 text-right text-negative-600">{formatCurrency(empresa.pago)}</td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    empresa.saldoProjetado >= 0 ? 'text-positive-600' : 'text-negative-600'
                  }`}
                >
                  {formatCurrency(empresa.saldoProjetado)}
                </td>
              </tr>
            );
          })}
          <tr className="bg-graphite-50/80 font-semibold">
            <td className="px-4 py-3 text-graphite-900">CONSOLIDADO</td>
            <td className="px-4 py-3 text-right text-graphite-900">{formatCurrency(consolidado.aReceber)}</td>
            <td className="px-4 py-3 text-right text-graphite-900">{formatCurrency(consolidado.aPagar)}</td>
            <td className="px-4 py-3 text-right text-positive-700">{formatCurrency(consolidado.recebido)}</td>
            <td className="px-4 py-3 text-right text-negative-700">{formatCurrency(consolidado.pago)}</td>
            <td className={`px-4 py-3 text-right ${consolidado.saldoProjetado >= 0 ? 'text-positive-700' : 'text-negative-700'}`}>
              {formatCurrency(consolidado.saldoProjetado)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
