export function ImportProgress({ progresso }: { progresso: number }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
          <circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="#2563eb"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 34}
            strokeDashoffset={2 * Math.PI * 34 * (1 - progresso / 100)}
            className="transition-all duration-300 ease-out"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-graphite-900">
          {Math.round(progresso)}%
        </span>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-graphite-900">Importando dados...</p>
        <p className="mt-1 text-xs text-graphite-500">Isso pode levar alguns instantes.</p>
      </div>
      <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-graphite-100">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-300 ease-out"
          style={{ width: `${progresso}%` }}
        />
      </div>
    </div>
  );
}
