import type { FormaPagamento, TipoLancamento } from './common';

export interface LancamentoFluxoCaixa {
  id: string;
  companyId: string;
  data: string;
  descricao: string;
  tipo: TipoLancamento;
  categoriaNome: string;
  entrada: number;
  saida: number;
  saldo: number;
  formaPagamento: FormaPagamento;
}

export interface PontoFluxoCaixa {
  label: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

export interface ResumoFluxoCaixa {
  saldoInicial: number;
  totalEntradas: number;
  totalSaidas: number;
  saldoFinal: number;
}
