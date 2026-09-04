import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/utils/format';

interface ResumoContasBarProps {
  total: number;
  pago: number;
  emAberto: number;
  vencido: number;
  carregando?: boolean;
  labelTotal?: string;
}

export function ResumoContasBar({ total, pago, emAberto, vencido, carregando, labelTotal = 'Total' }: ResumoContasBarProps) {
  const itens = [
    { label: labelTotal, valor: total, cor: 'text-graphite-900' },
    { label: 'Pago', valor: pago, cor: 'text-positive-600' },
    { label: 'Em aberto', valor: emAberto, cor: 'text-brand-600' },
    { label: 'Vencido', valor: vencido, cor: 'text-negative-600' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {itens.map((item) => (
        <Card key={item.label} className="p-4">
          <p className="text-xs font-medium text-graphite-500">{item.label}</p>
          {carregando ? (
            <Skeleton className="mt-2 h-6 w-24" />
          ) : (
            <p className={`mt-1.5 text-lg font-semibold ${item.cor}`}>{formatCurrency(item.valor)}</p>
          )}
        </Card>
      ))}
    </div>
  );
}
