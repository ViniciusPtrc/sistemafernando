import type { RankingItem } from '@/types';
import { formatCurrency, formatNumber } from '@/utils/format';

export function RankingList({ itens, corBarra = '#2563eb' }: { itens: RankingItem[]; corBarra?: string }) {
  const maiorValor = Math.max(...itens.map((item) => item.valor), 1);

  if (itens.length === 0) {
    return <p className="py-6 text-center text-sm text-graphite-400">Nenhum dado disponível.</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {itens.map((item, indice) => (
        <li key={item.id}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-graphite-100 text-xs font-semibold text-graphite-500">
                {indice + 1}
              </span>
              <span className="truncate font-medium text-graphite-800">{item.nome}</span>
            </div>
            <div className="flex flex-shrink-0 items-baseline gap-2">
              <span className="font-semibold text-graphite-900">{formatCurrency(item.valor)}</span>
              <span className="text-xs text-graphite-400">{formatNumber(item.quantidade)} tít.</span>
            </div>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-graphite-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${(item.valor / maiorValor) * 100}%`, backgroundColor: corBarra }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
