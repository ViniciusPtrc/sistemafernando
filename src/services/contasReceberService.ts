import type {
  ContaReceber,
  FiltroContasReceber,
  OrdenacaoState,
  PaginacaoState,
  RangeData,
  RespostaPaginada,
} from '@/types';
import type {
  PontoEvolucaoContasReceber,
  ResumoContasReceber,
  ResumoContasReceberPorCliente,
  ResumoContasReceberPorEmpresa,
} from '@/utils/calculoContasReceber';
import { apiGet, apiSend, buildQuery } from './api';
import {
  centsToReais,
  mapPaginacao,
  mapReceivable,
  statusToApi,
  type EnvelopeApi,
  type ReceivableDTO,
} from './adapters';

export type {
  PontoEvolucaoContasReceber,
  ResumoContasReceber,
  ResumoContasReceberPorCliente,
  ResumoContasReceberPorEmpresa,
};

const CAMPO_ORDENACAO: Record<string, string> = {
  vencimento: 'dueDate',
  clienteNome: 'customerName',
  documento: 'documentNumber',
  categoriaNome: 'categoryName',
  valor: 'amountCents',
  dataPagamento: 'paymentDate',
  criadoEm: 'createdAt',
  status: 'status',
};

/**
 * Filtros comuns a listagem e resumo. `status` fica de fora de propósito: os
 * resumos/evolução são quebras por status (recebido / vencido / a vencer), então
 * aplicar o filtro de status ali zeraria os demais. A listagem readiciona
 * `status` explicitamente.
 */
function queryDoFiltro(filtro?: FiltroContasReceber): Record<string, string | number | undefined> {
  return {
    companyId: filtro?.companyId,
    category: filtro?.categoriaId || undefined,
    customerName: filtro?.clienteId || undefined,
    paymentMethod: filtro?.formaPagamento || undefined,
    collectionChannel: filtro?.canalCobranca || undefined,
    search: filtro?.busca || undefined,
    dueStart: filtro?.vencimento?.inicio,
    dueEnd: filtro?.vencimento?.fim,
    paymentStart: filtro?.dataRecebimento?.inicio,
    paymentEnd: filtro?.dataRecebimento?.fim,
  };
}

export async function getContasReceber(params?: {
  filtro?: FiltroContasReceber;
  ordenacao?: OrdenacaoState<keyof ContaReceber & string>;
  paginacao?: PaginacaoState;
}): Promise<RespostaPaginada<ContaReceber>> {
  const paginacao = params?.paginacao ?? { pagina: 1, itensPorPagina: 10 };
  const ordenacao = params?.ordenacao;
  const sort = ordenacao ? `${CAMPO_ORDENACAO[ordenacao.campo] ?? 'dueDate'}:${ordenacao.direcao}` : undefined;

  const query = buildQuery({
    ...queryDoFiltro(params?.filtro),
    status: statusToApi(params?.filtro?.status, 'receivable'),
    page: paginacao.pagina,
    limit: paginacao.itensPorPagina,
    sort,
  });

  const envelope = await apiGet<EnvelopeApi<ReceivableDTO>>(`/receivables${query}`);
  return mapPaginacao(envelope, mapReceivable);
}

interface ResumoTotaisDTO {
  quantidadeTitulos: number;
  quantidadeClientes: number;
  totalBrutoCents: number;
  totalLiquidoCents: number;
  recebidoCents: number;
  emAbertoCents: number;
  vencidoCents: number;
  aVencerCents: number;
}

function mapResumo(dto: ResumoTotaisDTO): ResumoContasReceber {
  return {
    quantidadeTitulos: dto.quantidadeTitulos,
    quantidadeClientes: dto.quantidadeClientes,
    totalBruto: centsToReais(dto.totalBrutoCents),
    totalLiquido: centsToReais(dto.totalLiquidoCents),
    recebido: centsToReais(dto.recebidoCents),
    emAberto: centsToReais(dto.emAbertoCents),
    vencido: centsToReais(dto.vencidoCents),
    aVencer: centsToReais(dto.aVencerCents),
  };
}

export async function getResumoContasReceber(filtro?: FiltroContasReceber): Promise<ResumoContasReceber> {
  const query = buildQuery({ ...queryDoFiltro(filtro), group: 'totais' });
  return mapResumo(await apiGet<ResumoTotaisDTO>(`/receivables/summary${query}`));
}

export async function getEvolucaoContasReceber(filtro?: FiltroContasReceber): Promise<PontoEvolucaoContasReceber[]> {
  const query = buildQuery({ ...queryDoFiltro(filtro), group: 'mes' });
  const rows = await apiGet<{ mes: string; recebidoCents: number; vencidoCents: number; aVencerCents: number }[]>(
    `/receivables/summary${query}`,
  );
  return rows.map((r) => ({
    mes: r.mes,
    recebido: centsToReais(r.recebidoCents),
    vencido: centsToReais(r.vencidoCents),
    aVencer: centsToReais(r.aVencerCents),
  }));
}

export async function getResumoContasReceberPorEmpresa(
  filtro?: FiltroContasReceber,
): Promise<ResumoContasReceberPorEmpresa[]> {
  const query = buildQuery({ ...queryDoFiltro(filtro), group: 'empresa' });
  const rows = await apiGet<(ResumoTotaisDTO & { companyId: string })[]>(`/receivables/summary${query}`);
  return rows.map((r) => ({ companyId: r.companyId, ...mapResumo({ ...r, quantidadeClientes: 0 }) }));
}

export async function getResumoContasReceberPorCliente(
  filtro?: FiltroContasReceber,
): Promise<ResumoContasReceberPorCliente[]> {
  const query = buildQuery({ ...queryDoFiltro(filtro), group: 'cliente' });
  const rows = await apiGet<
    {
      clienteId: string;
      clienteNome: string;
      quantidadeTitulos: number;
      totalLiquidoCents: number;
      recebidoCents: number;
      emAbertoCents: number;
      vencidoCents: number;
      saldoCents: number;
      proximoVencimento: string | null;
    }[]
  >(`/receivables/summary${query}`);

  return rows.map((r) => ({
    clienteId: r.clienteId,
    clienteNome: r.clienteNome,
    saldo: centsToReais(r.saldoCents),
    proximoVencimento: r.proximoVencimento,
    quantidadeTitulos: r.quantidadeTitulos,
    quantidadeClientes: 1,
    totalBruto: centsToReais(r.totalLiquidoCents),
    totalLiquido: centsToReais(r.totalLiquidoCents),
    recebido: centsToReais(r.recebidoCents),
    emAberto: centsToReais(r.emAbertoCents),
    vencido: centsToReais(r.vencidoCents),
    aVencer: centsToReais(r.emAbertoCents - r.vencidoCents),
  }));
}

export async function getContaReceberPorId(id: string): Promise<ContaReceber | undefined> {
  try {
    return mapReceivable(await apiGet<ReceivableDTO>(`/receivables/${id}`));
  } catch {
    return undefined;
  }
}

/**
 * Exclui o título de forma permanente (hard delete no backend). Atenção: se o
 * mesmo título ainda constar na planilha de origem, uma reimportação recria o
 * registro.
 */
export async function excluirContaReceber(id: string): Promise<void> {
  await apiSend<{ success: boolean; id: string }>(`/receivables/${id}`, 'DELETE');
}

/**
 * Intervalo de vencimento amplo usado como período padrão das telas de listagem,
 * garantindo que nenhum título fique escondido pelo filtro inicial.
 */
export function getRangeVencimentoCompleto(): RangeData {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear() - 3, 0, 1);
  const fim = new Date(hoje.getFullYear() + 2, 11, 31);
  return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
}
