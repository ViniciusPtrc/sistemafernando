import type { AlertaFinanceiro } from './common';
import type { PontoFluxoCaixa } from './fluxoCaixa';

export interface IndicadorComparativo {
  valor: number;
  quantidade: number;
  variacaoPercentual: number;
}

export interface RankingItem {
  id: string;
  nome: string;
  valor: number;
  quantidade: number;
}

export interface CategoriaDespesa {
  categoriaId: string;
  categoriaNome: string;
  valor: number;
  cor: string;
}

export interface DashboardFinanceiro {
  escopo: string;
  contasReceber: IndicadorComparativo;
  contasPagar: IndicadorComparativo;
  saldoProjetado: number;
  vencidoReceber: {
    valor: number;
    quantidade: number;
  };
  vencidoPagar: {
    valor: number;
    quantidade: number;
  };
  inadimplencia: {
    valorVencido: number;
    quantidadeVencidos: number;
    percentual: number;
  };
  totalRecebido: number;
  totalPago: number;
  ticketMedio: number;
  maiorCliente: RankingItem;
  maiorFornecedor: RankingItem;
  taxaInadimplencia: number;
  fluxoCaixa: PontoFluxoCaixa[];
  topClientes: RankingItem[];
  topFornecedores: RankingItem[];
  categoriasDespesa: CategoriaDespesa[];
  alertas: AlertaFinanceiro[];
}
