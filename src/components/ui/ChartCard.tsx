import type { ReactNode } from 'react';
import { Card } from './Card';

interface ChartCardProps {
  titulo: string;
  subtitulo?: string;
  acoes?: ReactNode;
  children: ReactNode;
}

export function ChartCard({ titulo, subtitulo, acoes, children }: ChartCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-graphite-900">{titulo}</h3>
          {subtitulo && <p className="mt-0.5 text-xs text-graphite-500">{subtitulo}</p>}
        </div>
        {acoes}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}
