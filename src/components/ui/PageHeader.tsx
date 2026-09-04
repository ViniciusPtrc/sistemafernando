import type { ReactNode } from 'react';

interface PageHeaderProps {
  titulo: string;
  subtitulo?: string;
  acoes?: ReactNode;
}

export function PageHeader({ titulo, subtitulo, acoes }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-graphite-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-graphite-900">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-graphite-500">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  );
}
