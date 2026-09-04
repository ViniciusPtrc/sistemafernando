import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('animate-pulse rounded-md bg-graphite-200/70', className)} {...props} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-graphite-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <Skeleton className="mt-4 h-7 w-32" />
      <Skeleton className="mt-3 h-3 w-20" />
    </div>
  );
}

export function TableSkeleton({ linhas = 6, colunas = 5 }: { linhas?: number; colunas?: number }) {
  return (
    <div className="w-full">
      {Array.from({ length: linhas }).map((_, linha) => (
        <div key={linha} className="flex items-center gap-4 border-b border-graphite-100 px-5 py-4">
          {Array.from({ length: colunas }).map((__, coluna) => (
            <Skeleton key={coluna} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="flex h-72 w-full items-end gap-2 rounded-lg bg-graphite-50 p-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="w-full" style={{ height: `${30 + ((i * 13) % 60)}%` }} />
      ))}
    </div>
  );
}
