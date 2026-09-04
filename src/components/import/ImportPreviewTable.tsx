import type { PreviewImportacao } from '@/types';
import { AlertTriangle, ArrowRight, FileSpreadsheet, Info } from 'lucide-react';
import { formatNumber } from '@/utils/format';

const FONTE_LABEL: Record<PreviewImportacao['fonte'], string> = {
  legacy: 'Sistema antigo',
  totvs: 'TOTVS',
};

export function ImportPreviewTable({ preview }: { preview: PreviewImportacao }) {
  const temErros = (preview.errosParseReal?.length ?? 0) > 0;
  const temAvisos = (preview.avisos?.length ?? 0) > 0;
  const faltando = preview.camposObrigatoriosFaltando ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-lg border border-graphite-200 bg-graphite-50/60 px-4 py-3.5">
        <FileSpreadsheet className="h-8 w-8 flex-shrink-0 text-brand-600" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-graphite-900">{preview.nomeArquivo}</p>
          <p className="text-xs text-graphite-500">
            Fonte: <strong>{FONTE_LABEL[preview.fonte]}</strong> · {formatNumber(preview.totalRegistros)} registros válidos
            {temErros ? ` · ${formatNumber(preview.errosParseReal!.length)} com erro` : ''}
          </p>
        </div>
      </div>

      {faltando.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-negative-200 bg-negative-50/70 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-negative-600" />
          <div className="text-sm text-negative-800">
            <p className="font-semibold">Não foi possível identificar todas as colunas obrigatórias.</p>
            <p className="mt-1">Campos faltando: {faltando.join(', ')}. Ajuste o arquivo e tente novamente.</p>
          </div>
        </div>
      )}

      {preview.mapeamento.length > 0 && (
        <div className="rounded-lg border border-graphite-200">
          <p className="border-b border-graphite-200 bg-graphite-50/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-graphite-500">
            Mapeamento identificado
          </p>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {preview.mapeamento.map((m, i) => (
                <tr key={`${m.colunaOrigem}-${i}`} className="border-b border-graphite-100 last:border-0">
                  <td className="px-4 py-2 text-graphite-700">{m.colunaOrigem}</td>
                  <td className="w-8 px-1 py-2 text-graphite-300">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </td>
                  <td className="px-4 py-2 font-medium text-graphite-900">{m.campoSistema}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {temAvisos && (
        <div className="flex items-start gap-2 rounded-lg border border-warning-200 bg-warning-50/70 p-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning-600" />
          <ul className="flex flex-col gap-0.5 text-xs text-warning-800">
            {preview.avisos.map((a, i) => (
              <li key={i}>{a.motivo}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="w-full overflow-x-auto rounded-lg border border-graphite-200">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-graphite-200 bg-graphite-50/60">
              {preview.colunas.map((coluna) => (
                <th
                  key={coluna}
                  className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-graphite-500"
                >
                  {coluna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.linhas.map((linha, indice) => (
              <tr key={indice} className="border-b border-graphite-100 last:border-0">
                {preview.colunas.map((coluna) => (
                  <td key={coluna} className="whitespace-nowrap px-4 py-2.5 text-graphite-700">
                    {linha[coluna]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-graphite-400">
        Exibindo {preview.linhas.length} de {formatNumber(preview.totalRegistros)} registros.
      </p>

      {temErros && (
        <div className="rounded-lg border border-negative-100 bg-negative-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-negative-700">
            Registros com erro ({formatNumber(preview.errosParseReal!.length)})
          </p>
          <ul className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto">
            {preview.errosParseReal!.map((erro, i) => (
              <li key={i} className="text-sm text-negative-700">
                Linha {erro.linha}: {erro.motivo}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
