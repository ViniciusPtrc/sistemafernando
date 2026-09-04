import type { LancamentoFluxoCaixa, PontoFluxoCaixa, ResumoFluxoCaixa, SelectedCompany } from '@/types';
import { apiGet, buildQuery } from './api';
import {
  centsToReais,
  mapCashFlowEntry,
  mapCashFlowPoint,
  type CashFlowEntryDTO,
  type CashFlowPointDTO,
  type CashFlowSummaryDTO,
} from './adapters';

function companyIdParam(companyId?: SelectedCompany): string {
  return !companyId || companyId === 'all' ? 'all' : companyId;
}

export async function getFluxoCaixaPontos(companyId?: SelectedCompany): Promise<PontoFluxoCaixa[]> {
  const query = buildQuery({ companyId: companyIdParam(companyId), groupBy: 'month' });
  const rows = await apiGet<CashFlowPointDTO[]>(`/cash-flow${query}`);
  return rows.map(mapCashFlowPoint);
}

export async function getFluxoCaixaLancamentos(companyId?: SelectedCompany): Promise<LancamentoFluxoCaixa[]> {
  const query = buildQuery({ companyId: companyIdParam(companyId) });
  const rows = await apiGet<CashFlowEntryDTO[]>(`/cash-flow/entries${query}`);
  return rows.map(mapCashFlowEntry);
}

export async function getFluxoCaixaResumo(companyId?: SelectedCompany): Promise<ResumoFluxoCaixa> {
  const query = buildQuery({ companyId: companyIdParam(companyId) });
  const dto = await apiGet<CashFlowSummaryDTO>(`/cash-flow/summary${query}`);
  return {
    saldoInicial: centsToReais(dto.openingBalanceCents),
    totalEntradas: centsToReais(dto.totalInflowCents),
    totalSaidas: centsToReais(dto.totalOutflowCents),
    saldoFinal: centsToReais(dto.closingBalanceCents),
  };
}

export async function getFluxoCaixaComparativoEmpresas(): Promise<Record<string, number | string>[]> {
  const rows = await apiGet<Record<string, number | string>[]>('/cash-flow/comparison');
  // valores das empresas vêm em centavos (exceto a chave "label")
  return rows.map((linha) => {
    const out: Record<string, number | string> = {};
    for (const [k, v] of Object.entries(linha)) {
      out[k] = k === 'label' ? v : centsToReais(v as number);
    }
    return out;
  });
}
