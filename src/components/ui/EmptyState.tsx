import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  titulo?: string;
  descricao?: string;
  icone?: ReactNode;
  acao?: ReactNode;
}

export function EmptyState({
  titulo = 'Nenhum registro encontrado',
  descricao = 'Ajuste os filtros ou tente novamente mais tarde.',
  icone,
  acao,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-graphite-100 text-graphite-400">
        {icone ?? <Inbox className="h-6 w-6" />}
      </div>
      <div>
        <p className="text-sm font-semibold text-graphite-900">{titulo}</p>
        <p className="mt-1 text-sm text-graphite-500">{descricao}</p>
      </div>
      {acao}
    </div>
  );
}
