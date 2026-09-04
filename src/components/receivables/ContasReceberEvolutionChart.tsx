import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PontoEvolucaoContasReceber } from '@/services/contasReceberService';
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

export function ContasReceberEvolutionChart({ dados }: { dados: PontoEvolucaoContasReceber[] }) {
  const dadosComSaldo = dados.reduce<(PontoEvolucaoContasReceber & { emAberto: number })[]>((acc, ponto) => {
    const emAberto = ponto.vencido + ponto.aVencer;
    acc.push({ ...ponto, emAberto });
    return acc;
  }, []);

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={dadosComSaldo} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
          tickFormatter={(valor: number) => formatCurrencyCompact(valor)}
          width={72}
        />
        <Tooltip content={<TooltipConteudo />} cursor={{ fill: '#f1f5f9' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 13, color: '#475569', paddingTop: 12 }} />
        <Bar dataKey="recebido" name="Recebido" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="vencido" name="Vencido" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="aVencer" name="A Vencer" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Line type="monotone" dataKey="emAberto" name="Saldo em Aberto" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
