import type { FormacaoPreco, RascunhoFormacaoPreco, RespostaPaginada } from '@/types';
import { apiGet, apiSend, buildQuery } from './api';
import { mapPaginacao, mapPriceFormation, buildPriceFormationPayload, type EnvelopeApi, type PriceFormationDTO } from './adapters';

export async function getFormacoesPreco(params: { companyId?: string; search?: string; page?: number; limit?: number } = {}): Promise<RespostaPaginada<FormacaoPreco>> {
  const query = buildQuery({
    companyId: params.companyId && params.companyId !== 'all' ? params.companyId : undefined,
    search: params.search,
    page: params.page ?? 1,
    limit: params.limit ?? 50,
  });
  const envelope = await apiGet<EnvelopeApi<PriceFormationDTO>>(`/price-formations${query}`);
  return mapPaginacao(envelope, mapPriceFormation);
}

export async function getFormacaoPreco(id: string): Promise<FormacaoPreco> {
  return mapPriceFormation(await apiGet<PriceFormationDTO>(`/price-formations/${id}`));
}

export async function criarFormacaoPreco(dados: RascunhoFormacaoPreco): Promise<FormacaoPreco> {
  return mapPriceFormation(await apiSend<PriceFormationDTO>('/price-formations', 'POST', buildPriceFormationPayload(dados)));
}

export async function atualizarFormacaoPreco(id: string, dados: RascunhoFormacaoPreco): Promise<FormacaoPreco> {
  return mapPriceFormation(await apiSend<PriceFormationDTO>(`/price-formations/${id}`, 'PUT', buildPriceFormationPayload(dados)));
}

export async function excluirFormacaoPreco(id: string): Promise<void> {
  await apiSend(`/price-formations/${id}`, 'DELETE');
}

export async function duplicarFormacaoPreco(id: string, nome?: string): Promise<FormacaoPreco> {
  return mapPriceFormation(await apiSend<PriceFormationDTO>(`/price-formations/${id}/duplicate`, 'POST', nome ? { name: nome } : undefined));
}
