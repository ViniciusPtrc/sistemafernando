import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategoriaDespesa } from '@/types';
import { formatCurrency, formatPercent } from '@/utils/format';

function TooltipConteudo({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CategoriaDespesa & { percentual: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded-lg border border-graphite-200 bg-white p-3 shadow-lg">
      <div className="flex items-center gap-2 text-sm">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.cor }} />
        <span className="font-semibold text-graphite-900">{item.categoriaNome}</span>
      </div>
      <p className="mt-1 text-sm text-graphite-600">{formatCurrency(item.valor)}</p>
      <p className="text-xs text-graphite-400">{formatPercent(item.percentual)} do total</p>
    </div>
  );
}

export function CategoryDonutChart({ dados }: { dados: CategoriaDespesa[] }) {
  const total = dados.reduce((soma, item) => soma + item.valor, 0);
  const comPercentual = dados.map((item) => ({ ...item, percentual: total > 0 ? (item.valor / total) * 100 : 0 }));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-[220px] w-full flex-shrink-0 sm:w-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={comPercentual}
              dataKey="valor"
              nameKey="categoriaNome"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={2}
              strokeWidth={0}
            >
              {comPercentual.map((item) => (
                <Cell key={item.categoriaId} fill={item.cor} />
              ))}
            </Pie>
            <Tooltip content={<TooltipConteudo />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex w-full flex-1 flex-col gap-2.5">
        {comPercentual.slice(0, 6).map((item) => (
          <div key={item.categoriaId} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: item.cor }} />
              <span className="truncate text-graphite-600">{item.categoriaNome}</span>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <span className="font-medium text-graphite-900">{formatCurrency(item.valor)}</span>
              <span className="w-12 text-right text-xs text-graphite-400">{formatPercent(item.percentual, 0)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
