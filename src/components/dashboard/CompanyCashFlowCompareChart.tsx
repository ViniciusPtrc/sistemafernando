import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Company } from '@/types';
import { formatCurrency, formatCurrencyCompact } from '@/utils/format';

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

function TooltipConteudo({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-graphite-200 bg-white p-3 shadow-lg">
      <p className="mb-1.5 text-xs font-semibold text-graphite-500">{label}</p>
      <div className="flex flex-col gap-1">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-graphite-500">{item.name}:</span>
            <span className="font-semibold text-graphite-900">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompanyCashFlowCompareChart({
  dados,
  empresas,
}: {
  dados: Record<string, number | string>[];
  empresas: Company[];
}) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
          tickFormatter={(valor: number) => formatCurrencyCompact(valor)}
          width={72}
        />
        <Tooltip content={<TooltipConteudo />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 13, color: '#475569', paddingTop: 12 }} />
        {empresas.map((empresa) => (
          <Line
            key={empresa.id}
            type="monotone"
            dataKey={empresa.id}
            name={empresa.shortName}
            stroke={empresa.color}
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
