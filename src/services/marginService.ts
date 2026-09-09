import type { Contrato, ContratoMargemDetalhe, ContratoProjecao, CustoContrato, MargemMensal, MargemPorContrato, MargemResumo, PayableVinculavel, PeriodoPreset, ReceitaVinculavel, RecorrenciaCusto, RespostaPaginada, StatusContrato } from '@/types';
import { apiGet, apiSend, buildQuery } from './api';
import {
  mapContract,
  mapContractCost,
  mapContractMargin,
  mapContractProjection,
  mapLinkablePayable,
  mapLinkableReceivable,
  mapMarginByContract,
  mapMarginMonthly,
  mapMarginSummary,
  mapPaginacao,
  type ContractCostDTO,
  type ContractDTO,
  type ContractMarginDTO,
  type ContractProjectionDTO,
  type EnvelopeApi,
  type LinkablePayableDTO,
  type LinkableReceivableDTO,
  type MarginByContractDTO,
  type MarginMonthlyDTO,
  type MarginSummaryDTO,
} from './adapters';

export interface FiltroMargem {
  period: PeriodoPreset;
  from?: string;
  to?: string;
  companyId?: string;
  contractId?: string;
  customerName?: string;
  search?: string;
  status?: StatusContrato;
}

function queryDoFiltro(f: FiltroMargem) {
  return {
    period: f.period,
    from: f.from,
    to: f.to,
    companyId: f.companyId && f.companyId !== 'all' ? f.companyId : undefined,
    contractId: f.contractId || undefined,
    customerName: f.customerName || undefined,
    search: f.search?.trim() || undefined,
    status: f.status || undefined,
  };
}

export async function getMargemResumo(filtro: FiltroMargem): Promise<MargemResumo> {
  const dto = await apiGet<MarginSummaryDTO>(`/margin/summary${buildQuery(queryDoFiltro(filtro))}`);
  return mapMarginSummary(dto);
}

export async function getMargemMensal(filtro: FiltroMargem): Promise<MargemMensal[]> {
  const dtos = await apiGet<MarginMonthlyDTO[]>(`/margin/monthly${buildQuery(queryDoFiltro(filtro))}`);
  return dtos.map(mapMarginMonthly);
}

export type OrdenacaoMargemContrato = 'receita' | 'custos' | 'lucro' | 'margem' | 'receita_asc' | 'custos_asc' | 'lucro_asc' | 'margem_asc';

export async function getMargemPorContrato(filtro: FiltroMargem, sort: OrdenacaoMargemContrato = 'margem'): Promise<MargemPorContrato[]> {
  const dtos = await apiGet<MarginByContractDTO[]>(`/margin/by-contract${buildQuery({ ...queryDoFiltro(filtro), sort })}`);
  return dtos.map(mapMarginByContract);
}

export async function getContratoMargem(contractId: string, filtro: Omit<FiltroMargem, 'contractId'>): Promise<ContratoMargemDetalhe> {
  const dto = await apiGet<ContractMarginDTO>(`/contracts/${contractId}/margin${buildQuery(queryDoFiltro({ ...filtro, contractId: undefined }))}`);
  return mapContractMargin(dto);
}

export async function getContratoMargemMensal(contractId: string, filtro: Omit<FiltroMargem, 'contractId'>): Promise<MargemMensal[]> {
  const dtos = await apiGet<MarginMonthlyDTO[]>(`/contracts/${contractId}/margin/monthly${buildQuery(queryDoFiltro({ ...filtro, contractId: undefined }))}`);
  return dtos.map(mapMarginMonthly);
}

export async function getContratoProjecao(contractId: string, meses = 36): Promise<ContratoProjecao> {
  const dto = await apiGet<ContractProjectionDTO>(`/contracts/${contractId}/margin/projection${buildQuery({ months: meses })}`);
  return mapContractProjection(dto);
}

/* --------------------------------- Contratos (CRUD) --------------------------------- */

export async function getContratos(params: { companyId?: string; status?: StatusContrato; search?: string; page?: number; limit?: number }): Promise<RespostaPaginada<Contrato>> {
  const query = buildQuery({
    companyId: params.companyId && params.companyId !== 'all' ? params.companyId : undefined,
    status: params.status,
    search: params.search,
    page: params.page ?? 1,
    limit: params.limit ?? 50,
  });
  const envelope = await apiGet<EnvelopeApi<ContractDTO>>(`/contracts${query}`);
  return mapPaginacao(envelope, mapContract);
}

export interface NovoContrato {
  companyId: string;
  number: string;
  customerName: string;
  customerDocument?: string;
  contractedValue?: number;
  monthlyRevenue?: number;
  startDate: string;
  endDate?: string | null;
  status?: StatusContrato;
  notes?: string;
}

export async function criarContrato(dados: NovoContrato): Promise<Contrato> {
  return mapContract(await apiSend<ContractDTO>('/contracts', 'POST', dados));
}

export async function atualizarContrato(id: string, dados: Partial<NovoContrato>): Promise<Contrato> {
  return mapContract(await apiSend<ContractDTO>(`/contracts/${id}`, 'PUT', dados));
}

/* --------------------------------- Vincular receitas --------------------------------- */

export async function getReceitasVinculaveis(contractId: string, params: { search?: string; page?: number; limit?: number } = {}): Promise<RespostaPaginada<ReceitaVinculavel>> {
  const query = buildQuery({ search: params.search, page: params.page ?? 1, limit: params.limit ?? 50 });
  const envelope = await apiGet<EnvelopeApi<LinkableReceivableDTO>>(`/contracts/${contractId}/revenues/linkable${query}`);
  return mapPaginacao(envelope, mapLinkableReceivable);
}

export async function vincularReceitas(contractId: string, receivableIds: string[]): Promise<{ linked: number }> {
  return apiSend(`/contracts/${contractId}/revenues/link`, 'POST', { receivableIds });
}

export async function desvincularReceita(contractId: string, receivableId: string): Promise<void> {
  await apiSend(`/contracts/${contractId}/revenues/${receivableId}/link`, 'DELETE');
}

/* ----------------------------------- Custos ----------------------------------- */

export async function getCustosContrato(contractId: string): Promise<CustoContrato[]> {
  const dtos = await apiGet<ContractCostDTO[]>(`/contracts/${contractId}/costs`);
  return dtos.map(mapContractCost);
}

export async function getPayablesVinculaveis(contractId: string, params: { search?: string; page?: number; limit?: number } = {}): Promise<RespostaPaginada<PayableVinculavel>> {
  const query = buildQuery({ search: params.search, page: params.page ?? 1, limit: params.limit ?? 50 });
  const envelope = await apiGet<EnvelopeApi<LinkablePayableDTO>>(`/contracts/${contractId}/costs/linkable${query}`);
  return mapPaginacao(envelope, mapLinkablePayable);
}

export async function vincularCustos(contractId: string, payableIds: string[], type: 'realizado' | 'projetado'): Promise<{ linked: number }> {
  return apiSend(`/contracts/${contractId}/costs/link`, 'POST', { payableIds, type });
}

export interface NovoCustoManual {
  description: string;
  category?: string;
  supplierName?: string;
  amount: number;
  date: string;
  type: 'realizado' | 'projetado';
  recurrence?: RecorrenciaCusto;
  installments?: number;
  recurrenceEndDate?: string | null;
  notes?: string;
}

export async function criarCustoManual(contractId: string, dados: NovoCustoManual): Promise<CustoContrato> {
  return mapContractCost(await apiSend<ContractCostDTO>(`/contracts/${contractId}/costs`, 'POST', dados));
}

export async function atualizarCustoManual(contractId: string, costId: string, dados: Partial<NovoCustoManual>): Promise<CustoContrato> {
  return mapContractCost(await apiSend<ContractCostDTO>(`/contracts/${contractId}/costs/${costId}`, 'PUT', dados));
}

export async function excluirCusto(contractId: string, costId: string): Promise<void> {
  await apiSend(`/contracts/${contractId}/costs/${costId}`, 'DELETE');
}
