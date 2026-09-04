import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumber } from '@/utils/format';

interface PaginationProps {
  pagina: number;
  itensPorPagina: number;
  total: number;
  onPaginaChange: (pagina: number) => void;
}

export function Pagination({ pagina, itensPorPagina, total, onPaginaChange }: PaginationProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / itensPorPagina));
  const inicio = total === 0 ? 0 : (pagina - 1) * itensPorPagina + 1;
  const fim = Math.min(pagina * itensPorPagina, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-graphite-200 px-5 py-3.5 sm:flex-row">
      <p className="text-sm text-graphite-500">
        Mostrando <span className="font-medium text-graphite-700">{formatNumber(inicio)}</span>–
        <span className="font-medium text-graphite-700">{formatNumber(fim)}</span> de{' '}
        <span className="font-medium text-graphite-700">{formatNumber(total)}</span> registros
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={pagina <= 1}
          onClick={() => onPaginaChange(pagina - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-graphite-300 text-graphite-500 hover:bg-graphite-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-3 text-sm font-medium text-graphite-700">
          Página {pagina} de {totalPaginas}
        </span>
        <button
          type="button"
          disabled={pagina >= totalPaginas}
          onClick={() => onPaginaChange(pagina + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-graphite-300 text-graphite-500 hover:bg-graphite-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
