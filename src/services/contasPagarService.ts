import type {
  ContaPagar,
  FiltroContasPagar,
  OrdenacaoState,
  PaginacaoState,
  RespostaPaginada,
} from '@/types';
import { apiGet, apiSend, buildQuery } from './api';
import {
  centsToReais,
  mapPaginacao,
  mapPayable,
  statusToApi,
  type EnvelopeApi,
  type PayableDTO,
} from './adapters';

export interface ResumoContasPagar {
  total: number;
  pago: number;
  emAberto: number;
  vencido: number;
}

const CAMPO_ORDENACAO: Record<string, string> = {
  vencimento: 'dueDate',
  fornecedorNome: 'supplierName',
  documento: 'documentNumber',
  categoriaNome: 'categoryName',
  valor: 'amountCents',
  dataPagamento: 'paymentDate',
  criadoEm: 'createdAt',
  status: 'status',
};

/**
 * Filtros comuns a listagem e resumo. `status` fica de fora de propósito: o
 * resumo é uma quebra por status (total / pago / em aberto / vencido), então
 * aplicar o filtro de status ali zeraria os outros cartões. A listagem readiciona
 * `status` explicitamente.
 */
function queryDoFiltro(filtro?: FiltroContasPagar): Record<string, string | number | undefined> {
  return {
    companyId: filtro?.companyId,
    category: filtro?.categoriaId || undefined,
    supplierName: filtro?.fornecedorId || undefined,
    paymentMethod: filtro?.formaPagamento || undefined,
    search: filtro?.busca || undefined,
    dueStart: filtro?.vencimento?.inicio,
    dueEnd: filtro?.vencimento?.fim,
  };
}

export async function getContasPagar(params?: {
  filtro?: FiltroContasPagar;
  ordenacao?: OrdenacaoState<keyof ContaPagar & string>;
  paginacao?: PaginacaoState;
}): Promise<RespostaPaginada<ContaPagar>> {
  const paginacao = params?.paginacao ?? { pagina: 1, itensPorPagina: 10 };
  const ordenacao = params?.ordenacao;
  const sort = ordenacao ? `${CAMPO_ORDENACAO[ordenacao.campo] ?? 'dueDate'}:${ordenacao.direcao}` : undefined;

  const query = buildQuery({
    ...queryDoFiltro(params?.filtro),
    status: statusToApi(params?.filtro?.status, 'payable'),
    page: paginacao.pagina,
    limit: paginacao.itensPorPagina,
    sort,
  });

  const envelope = await apiGet<EnvelopeApi<PayableDTO>>(`/payables${query}`);
  return mapPaginacao(envelope, mapPayable);
}

export async function getResumoContasPagar(filtro?: FiltroContasPagar): Promise<ResumoContasPagar> {
  const query = buildQuery({ ...queryDoFiltro(filtro), group: 'totais' });
  const dto = await apiGet<{
    totalLiquidoCents: number;
    recebidoCents: number;
    emAbertoCents: number;
    vencidoCents: number;
  }>(`/payables/summary${query}`);
  return {
    total: centsToReais(dto.totalLiquidoCents),
    pago: centsToReais(dto.recebidoCents),
    emAberto: centsToReais(dto.emAbertoCents),
    vencido: centsToReais(dto.vencidoCents),
  };
}

export async function getContaPagarPorId(id: string): Promise<ContaPagar | undefined> {
  try {
    return mapPayable(await apiGet<PayableDTO>(`/payables/${id}`));
  } catch {
    return undefined;
  }
}

/**
 * Exclui o título de forma permanente (hard delete no backend). Atenção: se o
 * mesmo título ainda constar na planilha de origem, uma reimportação recria o
 * registro.
 */
export async function excluirContaPagar(id: string): Promise<void> {
  await apiSend<{ success: boolean; id: string }>(`/payables/${id}`, 'DELETE');
}
