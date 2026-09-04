import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { clsx } from 'clsx';
import { Card } from '@/components/ui/Card';
import { formatNumber, formatPercent } from '@/utils/format';

type Tom = 'neutro' | 'positivo' | 'negativo' | 'destaque';

interface FinancialCardProps {
  titulo: string;
  valor: string;
  icone: ReactNode;
  tom?: Tom;
  linhaDetalhe?: string;
  variacaoPercentual?: number;
  quantidade?: number;
  labelQuantidade?: string;
}

const TOM_ICONE: Record<Tom, string> = {
  neutro: 'bg-graphite-100 text-graphite-600',
  positivo: 'bg-positive-50 text-positive-600',
  negativo: 'bg-negative-50 text-negative-600',
  destaque: 'bg-brand-50 text-brand-600',
};

export function FinancialCard({
  titulo,
  valor,
  icone,
  tom = 'neutro',
  linhaDetalhe,
  variacaoPercentual,
  quantidade,
  labelQuantidade,
}: FinancialCardProps) {
  const variacaoPositiva = (variacaoPercentual ?? 0) >= 0;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-graphite-500">{titulo}</p>
        <span className={clsx('flex h-9 w-9 items-center justify-center rounded-lg', TOM_ICONE[tom])}>
          {icone}
        </span>
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-graphite-900">{valor}</p>

      <div className="mt-2 flex items-center gap-2 text-xs text-graphite-500">
        {quantidade !== undefined && (
          <span>
            {formatNumber(quantidade)} {labelQuantidade ?? 'títulos'}
          </span>
        )}
        {variacaoPercentual !== undefined && (
          <span
            className={clsx(
              'inline-flex items-center gap-0.5 font-medium',
              variacaoPositiva ? 'text-positive-600' : 'text-negative-600',
            )}
          >
            {variacaoPositiva ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {formatPercent(Math.abs(variacaoPercentual))}
          </span>
        )}
        {linhaDetalhe && <span>{linhaDetalhe}</span>}
      </div>
    </Card>
  );
}
