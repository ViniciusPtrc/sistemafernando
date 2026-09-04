import type { CompanyMetrics } from '@/types';
import { ALL_COMPANIES, companies } from '@/mock/companies';
import { contasPagarMock } from '@/mock/contasPagar';
import { contasReceberMock } from '@/mock/contasReceber';
import { calcularResumoContasReceber } from './calculoContasReceber';

function porEmpresa<T extends { companyId: string }>(itens: T[], companyId?: string): T[] {
  if (!companyId || companyId === ALL_COMPANIES) return itens;
  return itens.filter((item) => item.companyId === companyId);
}

function somar<T>(itens: T[], selecionar: (item: T) => number): number {
  return itens.reduce((soma, item) => soma + selecionar(item), 0);
}

export function calculateCompanyMetrics(companyId?: string): CompanyMetrics {
  const receber = porEmpresa(contasReceberMock, companyId).filter((c) => c.status !== 'cancelado');
  const pagar = porEmpresa(contasPagarMock, companyId).filter((c) => c.status !== 'cancelado');

  const resumoReceber = calcularResumoContasReceber(receber);
  const receberAberto = receber.filter((c) => c.status === 'a_vencer' || c.status === 'vencido');
  const pagarAberto = pagar.filter((c) => c.status === 'em_aberto' || c.status === 'vencido');
  const receberVencido = receber.filter((c) => c.status === 'vencido');
  const pagarVencido = pagar.filter((c) => c.status === 'vencido');
  const pagarPago = pagar.filter((c) => c.status === 'pago');

  const aPagar = somar(pagarAberto, (c) => c.valor);
  const totalTitulos = receber.length + pagar.length;
  const totalVencidos = receberVencido.length + pagarVencido.length;

  const empresa = companyId && companyId !== ALL_COMPANIES ? companies.find((c) => c.id === companyId) : undefined;

  return {
    companyId: companyId && companyId !== ALL_COMPANIES ? companyId : ALL_COMPANIES,
    companyName: empresa?.name ?? 'Consolidado',
    shortName: empresa?.shortName ?? 'Consolidado',
    color: empresa?.color ?? '#0f172a',
    aReceber: resumoReceber.emAberto,
    aPagar,
    recebido: resumoReceber.recebido,
    pago: somar(pagarPago, (c) => c.valor),
    saldoProjetado: resumoReceber.emAberto - aPagar,
    vencidoReceber: resumoReceber.vencido,
    vencidoPagar: somar(pagarVencido, (c) => c.valor),
    quantidadeReceber: receberAberto.length,
    quantidadePagar: pagarAberto.length,
    taxaInadimplencia: totalTitulos > 0 ? (totalVencidos / totalTitulos) * 100 : 0,
  };
}

export function calculateAllCompaniesMetrics(): CompanyMetrics[] {
  return companies.map((empresa) => calculateCompanyMetrics(empresa.id));
}

export function calculateConsolidatedMetrics(): CompanyMetrics {
  return calculateCompanyMetrics();
}

export function calculateConsolidatedReceivables(): number {
  return calculateConsolidatedMetrics().aReceber;
}

export function calculateConsolidatedPayables(): number {
  return calculateConsolidatedMetrics().aPagar;
}

export function calculateConsolidatedBalance(): number {
  return calculateConsolidatedMetrics().saldoProjetado;
}
