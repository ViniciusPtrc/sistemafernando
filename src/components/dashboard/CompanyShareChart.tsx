import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CompanyMetrics } from '@/types';
import { formatCurrency, formatPercent } from '@/utils/format';

interface FatiaEmpresa {
  id: string;
  nome: string;
  valor: number;
  cor: string;
  percentual: number;
}

function construirFatias(empresas: CompanyMetrics[], metrica: 'aReceber' | 'aPagar'): FatiaEmpresa[] {
  const total = empresas.reduce((soma, empresa) => soma + empresa[metrica], 0);
  return empresas.map((empresa) => ({
    id: empresa.companyId,
    nome: empresa.shortName,
    valor: empresa[metrica],
    cor: empresa.color,
    percentual: total > 0 ? (empresa[metrica] / total) * 100 : 0,
  }));
}

function TooltipConteudo({ active, payload }: { active?: boolean; payload?: { payload: FatiaEmpresa }[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded-lg border border-graphite-200 bg-white p-3 shadow-lg">
      <div className="flex items-center gap-2 text-sm">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.cor }} />
        <span className="font-semibold text-graphite-900">{item.nome}</span>
      </div>
      <p className="mt-1 text-sm text-graphite-600">{formatCurrency(item.valor)}</p>
      <p className="text-xs text-graphite-400">{formatPercent(item.percentual)} do total</p>
    </div>
  );
}

export function CompanyShareChart({
  empresas,
  metrica,
}: {
  empresas: CompanyMetrics[];
  metrica: 'aReceber' | 'aPagar';
}) {
  const fatias = construirFatias(empresas, metrica);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-[220px] w-full flex-shrink-0 sm:w-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={fatias}
              dataKey="valor"
              nameKey="nome"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={2}
              strokeWidth={0}
            >
              {fatias.map((fatia) => (
                <Cell key={fatia.id} fill={fatia.cor} />
              ))}
            </Pie>
            <Tooltip content={<TooltipConteudo />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex w-full flex-1 flex-col gap-2.5">
        {fatias.map((fatia) => (
          <div key={fatia.id} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: fatia.cor }} />
              <span className="truncate text-graphite-600">{fatia.nome}</span>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <span className="font-medium text-graphite-900">{formatCurrency(fatia.valor)}</span>
              <span className="w-12 text-right text-xs text-graphite-400">{formatPercent(fatia.percentual, 0)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
