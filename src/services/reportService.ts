import type { PeriodoFiltro, TipoRelatorio } from '@/types';
import { apiGet, buildQuery } from './api';

export interface TabelaRelatorio {
  colunas: string[];
  linhas: (string | number)[][];
}

/**
 * Dados de um relatório já formatados pelo backend (moeda "R$ 1.250,00",
 * datas "DD/MM/YYYY") — prontos para a tabela do ReportPreviewModal.
 */
export async function getTabelaRelatorio(
  tipo: TipoRelatorio,
  periodo?: PeriodoFiltro,
  companyId?: string,
): Promise<TabelaRelatorio> {
  const query = buildQuery({
    companyId: companyId && companyId !== 'all' ? companyId : undefined,
    startDate: periodo?.range.inicio,
    endDate: periodo?.range.fim,
  });
  return apiGet<TabelaRelatorio>(`/reports/${tipo}${query}`);
}
