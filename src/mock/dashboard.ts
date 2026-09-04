import type {
  AlertaFinanceiro,
  CategoriaDespesa,
  DashboardFinanceiro,
  RankingItem,
} from '@/types';
import { formatCurrency } from '@/utils/format';
import { calculateCompanyMetrics } from '@/utils/companyMetrics';
import { categoriasDespesa as categoriasDespesaBase } from './categorias';
import { ALL_COMPANIES } from './companies';
import { contasPagarMock } from './contasPagar';
import { contasReceberMock } from './contasReceber';
import { gerarPontosFluxoCaixa } from './fluxoCaixa';

function porEmpresa<T extends { companyId: string }>(itens: T[], companyId?: string): T[] {
  if (!companyId || companyId === ALL_COMPANIES) return itens;
  return itens.filter((item) => item.companyId === companyId);
}

function somar<T>(itens: T[], selecionar: (item: T) => number): number {
  return itens.reduce((soma, item) => soma + selecionar(item), 0);
}

function construirRanking<T>(
  origem: T[],
  idDe: (item: T) => string,
  nomeDe: (item: T) => string,
  valorDe: (item: T) => number,
): RankingItem[] {
  const mapa = new Map<string, RankingItem>();
  for (const conta of origem) {
    const id = idDe(conta);
    const nome = nomeDe(conta);
    const atual = mapa.get(id) ?? { id, nome, valor: 0, quantidade: 0 };
    atual.valor += valorDe(conta);
    atual.quantidade += 1;
    mapa.set(id, atual);
  }
  return Array.from(mapa.values()).sort((a, b) => b.valor - a.valor);
}

export function gerarDashboard(companyId?: string): DashboardFinanceiro {
  const hoje = new Date().toISOString().slice(0, 10);

  const receberBase = porEmpresa(contasReceberMock, companyId);
  const pagarBase = porEmpresa(contasPagarMock, companyId);

  const receberAtivas = receberBase.filter((c) => c.status !== 'cancelado');
  const pagarAtivas = pagarBase.filter((c) => c.status !== 'cancelado');

  const receberEmAberto = receberAtivas.filter((c) => c.status === 'a_vencer' || c.status === 'vencido');
  const pagarEmAberto = pagarAtivas.filter((c) => c.status === 'em_aberto' || c.status === 'vencido');

  const receberVencidas = receberAtivas.filter((c) => c.status === 'vencido');
  const pagarVencidas = pagarAtivas.filter((c) => c.status === 'vencido');

  const metrics = calculateCompanyMetrics(companyId);

  const rankingClientes = construirRanking(receberEmAberto, (c) => c.clienteId, (c) => c.clienteNome, (c) => c.valor);
  const rankingFornecedores = construirRanking(pagarEmAberto, (c) => c.fornecedorId, (c) => c.fornecedorNome, (c) => c.valor);

  const categoriasDespesaAgregadas: CategoriaDespesa[] = categoriasDespesaBase
    .map((categoria) => {
      const valor = somar(
        pagarAtivas.filter((c) => c.categoriaId === categoria.id),
        (c) => c.valor,
      );
      return {
        categoriaId: categoria.id,
        categoriaNome: categoria.nome,
        valor,
        cor: categoria.cor,
      };
    })
    .filter((item) => item.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  const maiorCliente = rankingClientes[0] ?? { id: '', nome: '—', valor: 0, quantidade: 0 };
  const maiorFornecedor = rankingFornecedores[0] ?? { id: '', nome: '—', valor: 0, quantidade: 0 };

  const ticketMedio = receberAtivas.length > 0 ? somar(receberAtivas, (c) => c.valor) / receberAtivas.length : 0;

  const valorVencidoTotal = metrics.vencidoReceber + metrics.vencidoPagar;
  const quantidadeVencidosTotal = receberVencidas.length + pagarVencidas.length;

  const alertas: AlertaFinanceiro[] = [];

  if (valorVencidoTotal > 0) {
    alertas.push({
      id: 'alerta-vencidas',
      nivel: 'critico',
      mensagem: `${formatCurrency(valorVencidoTotal)} em contas vencidas`,
      detalhe: `${quantidadeVencidosTotal} títulos vencidos precisam de atenção imediata.`,
    });
  }

  const proximos7Dias = receberEmAberto.filter((c) => {
    const diasParaVencer = (new Date(`${c.vencimento}T00:00:00`).getTime() - new Date(`${hoje}T00:00:00`).getTime()) / 86_400_000;
    return diasParaVencer >= 0 && diasParaVencer <= 7;
  });
  const pagarProximos7Dias = pagarEmAberto.filter((c) => {
    const diasParaVencer = (new Date(`${c.vencimento}T00:00:00`).getTime() - new Date(`${hoje}T00:00:00`).getTime()) / 86_400_000;
    return diasParaVencer >= 0 && diasParaVencer <= 7;
  });

  if (pagarProximos7Dias.length > 0) {
    alertas.push({
      id: 'alerta-vencendo',
      nivel: 'atencao',
      mensagem: `${pagarProximos7Dias.length} contas a pagar vencem nos próximos 7 dias`,
      detalhe: `Total de ${formatCurrency(somar(pagarProximos7Dias, (c) => c.valor))} previstos para saída.`,
    });
  }

  if (proximos7Dias.length > 0) {
    alertas.push({
      id: 'alerta-recebimentos',
      nivel: 'sucesso',
      mensagem: `Recebimentos previstos de ${formatCurrency(somar(proximos7Dias, (c) => c.valor))} esta semana`,
      detalhe: `${proximos7Dias.length} títulos com vencimento nos próximos 7 dias.`,
    });
  }

  return {
    escopo: companyId && companyId !== ALL_COMPANIES ? companyId : ALL_COMPANIES,
    contasReceber: {
      valor: metrics.aReceber,
      quantidade: metrics.quantidadeReceber,
      variacaoPercentual: 8.4,
    },
    contasPagar: {
      valor: metrics.aPagar,
      quantidade: metrics.quantidadePagar,
      variacaoPercentual: -3.2,
    },
    saldoProjetado: metrics.saldoProjetado,
    vencidoReceber: {
      valor: metrics.vencidoReceber,
      quantidade: receberVencidas.length,
    },
    vencidoPagar: {
      valor: metrics.vencidoPagar,
      quantidade: pagarVencidas.length,
    },
    inadimplencia: {
      valorVencido: valorVencidoTotal,
      quantidadeVencidos: quantidadeVencidosTotal,
      percentual: metrics.taxaInadimplencia,
    },
    totalRecebido: metrics.recebido,
    totalPago: metrics.pago,
    ticketMedio,
    maiorCliente,
    maiorFornecedor,
    taxaInadimplencia: metrics.taxaInadimplencia,
    fluxoCaixa: gerarPontosFluxoCaixa(companyId),
    topClientes: rankingClientes.slice(0, 5),
    topFornecedores: rankingFornecedores.slice(0, 5),
    categoriasDespesa: categoriasDespesaAgregadas,
    alertas,
  };
}
