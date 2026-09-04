import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CompanyMetrics } from '@/types';
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

export function CompanyComparisonChart({ empresas }: { empresas: CompanyMetrics[] }) {
  const dados = empresas.map((empresa) => ({
    nome: empresa.shortName,
    'A Receber': empresa.aReceber,
    'A Pagar': empresa.aPagar,
    Saldo: empresa.saldoProjetado,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="nome" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
          tickFormatter={(valor: number) => formatCurrencyCompact(valor)}
          width={72}
        />
        <Tooltip content={<TooltipConteudo />} cursor={{ fill: '#f1f5f9' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 13, color: '#475569', paddingTop: 12 }} />
        <Bar dataKey="A Receber" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={44} />
        <Bar dataKey="A Pagar" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={44} />
        <Line type="monotone" dataKey="Saldo" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: '#2563eb' }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
