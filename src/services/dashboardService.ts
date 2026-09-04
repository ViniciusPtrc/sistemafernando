import type { CompanyMetrics, DashboardFinanceiro, PeriodoFiltro, SelectedCompany } from '@/types';
import { apiGet, buildQuery } from './api';
import {
  mapCompanyMetrics,
  mapDashboard,
  type CompanyMetricsDTO,
  type DashboardDTO,
} from './adapters';

export type OrdenacaoRanking = 'saldo' | 'recebido' | 'aReceber' | 'aPagar' | 'inadimplencia';

export interface ComparativoEmpresas {
  empresas: CompanyMetrics[];
  consolidado: CompanyMetrics;
}

function companyIdParam(companyId?: SelectedCompany): string | undefined {
  return !companyId || companyId === 'all' ? 'all' : companyId;
}

export async function getDashboard(
  companyId?: SelectedCompany,
  periodo?: PeriodoFiltro,
): Promise<DashboardFinanceiro> {
  const query = buildQuery({
    companyId: companyIdParam(companyId),
    startDate: periodo?.range.inicio,
    endDate: periodo?.range.fim,
  });
  return mapDashboard(await apiGet<DashboardDTO>(`/dashboard${query}`));
}

interface ComparisonDTO {
  empresas: CompanyMetricsDTO[];
  consolidado: CompanyMetricsDTO;
}

export async function getCompanyComparison(): Promise<ComparativoEmpresas> {
  const dto = await apiGet<ComparisonDTO>('/dashboard/companies');
  return {
    empresas: dto.empresas.map(mapCompanyMetrics),
    consolidado: mapCompanyMetrics(dto.consolidado),
  };
}

export async function getCompanyRanking(ordenarPor: OrdenacaoRanking = 'saldo'): Promise<CompanyMetrics[]> {
  const dto = await apiGet<ComparisonDTO>(`/dashboard/companies${buildQuery({ sort: ordenarPor })}`);
  return dto.empresas.map(mapCompanyMetrics);
}
