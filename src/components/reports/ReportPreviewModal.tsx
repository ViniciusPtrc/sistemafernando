import { useState } from 'react';
import type { DefinicaoRelatorio, FormatoExportacao, PeriodoFiltro } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { DateFilter } from '@/components/ui/DateFilter';
import { ExportButton } from '@/components/ui/ExportButton';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChartSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/hooks/useToast';
import { useCompany } from '@/hooks/useCompany';
import { calcularRangePreset } from '@/utils/periodo';
import { getTabelaRelatorio, type TabelaRelatorio } from '@/services/reportService';
import { exportarCsv } from '@/utils/export';

export function ReportPreviewModal({
  relatorio,
  onFechar,
}: {
  relatorio: DefinicaoRelatorio | null;
  onFechar: () => void;
}) {
  const { notificar } = useToast();
  const { selectedCompany } = useCompany();
  const [periodo, setPeriodo] = useState<PeriodoFiltro>({
    preset: 'este_mes',
    range: calcularRangePreset('este_mes'),
  });
  const [tabela, setTabela] = useState<TabelaRelatorio | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);

  if (!relatorio) return null;

  const visualizar = async () => {
    setCarregando(true);
    setErro(false);
    try {
      setTabela(await getTabelaRelatorio(relatorio.tipo, periodo, selectedCompany));
    } catch {
      setErro(true);
      setTabela(null);
    } finally {
      setCarregando(false);
    }
  };

  const exportar = (formato: FormatoExportacao) => {
    if (!tabela) {
      notificar({ titulo: 'Gere o relatório primeiro', descricao: 'Clique em “Visualizar relatório” antes de exportar.', variante: 'info' });
      return;
    }
    if (formato === 'csv') {
      exportarCsv(relatorio.tipo, tabela.colunas, tabela.linhas);
      notificar({ titulo: 'Exportação concluída', descricao: 'Arquivo CSV baixado com sucesso.', variante: 'sucesso' });
      return;
    }
    notificar({
      titulo: 'Exportação em processamento',
      descricao: `O relatório em ${formato.toUpperCase()} será gerado pela API em produção.`,
      variante: 'info',
    });
  };

  return (
    <Modal aberto={relatorio !== null} onFechar={onFechar} titulo={relatorio.titulo} tamanho="xl">
      <div className="flex flex-col gap-5 p-6">
        <p className="text-sm text-graphite-500">{relatorio.descricao}</p>

        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-graphite-50 p-3">
          <DateFilter valor={periodo} onChange={setPeriodo} />
          <Button variante="secundario" onClick={visualizar} disabled={carregando}>
            {carregando ? 'Gerando...' : 'Visualizar relatório'}
          </Button>
          <div className="ml-auto">
            <ExportButton onExportar={exportar} />
          </div>
        </div>

        {carregando ? (
          <ChartSkeleton />
        ) : erro ? (
          <EmptyState
            titulo="Não foi possível gerar o relatório"
            descricao="Verifique se o servidor está no ar e tente novamente."
          />
        ) : !tabela ? (
          <EmptyState
            titulo="Relatório ainda não gerado"
            descricao="Selecione o período e clique em “Visualizar relatório” para ver os dados."
          />
        ) : tabela.linhas.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="w-full overflow-x-auto rounded-lg border border-graphite-200">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-graphite-200 bg-graphite-50/60">
                  {tabela.colunas.map((coluna) => (
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
                {tabela.linhas.map((linha, indice) => (
                  <tr key={indice} className="border-b border-graphite-100 last:border-0 hover:bg-graphite-50/50">
                    {linha.map((valor, i) => (
                      <td key={i} className="whitespace-nowrap px-4 py-2.5 text-graphite-700">
                        {valor}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
