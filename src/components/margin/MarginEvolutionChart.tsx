import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MargemMensal } from '@/types';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '@/utils/format';

function TooltipConteudo({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string; dataKey?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-graphite-200 bg-white p-3 shadow-lg">
      <p className="mb-1.5 text-xs font-semibold text-graphite-500">{label}</p>
      <div className="flex flex-col gap-1">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-graphite-500">{item.name}:</span>
            <span className="font-semibold text-graphite-900">
              {item.dataKey === 'margemPct' ? (item.value == null ? 'N/A' : formatPercent(item.value)) : formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarginEvolutionChart({ dados }: { dados: MargemMensal[] }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={8} />
        <YAxis
          yAxisId="valor"
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
          tickFormatter={(v: number) => formatCurrencyCompact(v)}
          width={72}
        />
        <YAxis
          yAxisId="margem"
          orientation="right"
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
          tickFormatter={(v: number) => `${v}%`}
          width={48}
        />
        <Tooltip content={<TooltipConteudo />} cursor={{ fill: '#f1f5f9' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 13, color: '#475569', paddingTop: 12 }} />
        <Bar yAxisId="valor" dataKey="receita" name="Receita" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar yAxisId="valor" dataKey="custos" name="Custos" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Line yAxisId="margem" type="monotone" dataKey="margemPct" name="Margem" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
