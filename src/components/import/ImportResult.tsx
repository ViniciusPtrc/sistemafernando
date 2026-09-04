import { AlertCircle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import type { ResultadoImportacao } from '@/types';
import { formatNumber } from '@/utils/format';

const CARTOES = [
  { chave: 'importados' as const, label: 'Registros importados', icone: CheckCircle2, cor: 'text-positive-600 bg-positive-50' },
  { chave: 'atualizados' as const, label: 'Registros atualizados', icone: RefreshCw, cor: 'text-brand-600 bg-brand-50' },
  { chave: 'ignorados' as const, label: 'Registros ignorados', icone: AlertCircle, cor: 'text-warning-600 bg-warning-50' },
  { chave: 'erros' as const, label: 'Erros', icone: XCircle, cor: 'text-negative-600 bg-negative-50' },
];

export function ImportResult({ resultado }: { resultado: ResultadoImportacao }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-positive-50 text-positive-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <p className="text-base font-semibold text-graphite-900">Importação concluída com sucesso</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CARTOES.map(({ chave, label, icone: Icone, cor }) => (
          <div key={chave} className="rounded-lg border border-graphite-200 p-4 text-center">
            <span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-lg ${cor}`}>
              <Icone className="h-5 w-5" />
            </span>
            <p className="mt-2 text-xl font-semibold text-graphite-900">{formatNumber(resultado[chave])}</p>
            <p className="mt-0.5 text-xs text-graphite-500">{label}</p>
          </div>
        ))}
      </div>

      {resultado.detalhesErros.length > 0 && (
        <div className="rounded-lg border border-negative-100 bg-negative-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-negative-700">Detalhes dos erros</p>
          <ul className="mt-2 flex flex-col gap-1">
            {resultado.detalhesErros.map((erro) => (
              <li key={erro} className="text-sm text-negative-700">
                {erro}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
