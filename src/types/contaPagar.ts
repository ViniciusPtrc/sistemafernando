import type { FormaPagamento, RangeData, StatusConta } from './common';

export interface FiltroContasPagar {
  busca?: string;
  companyId?: string;
  fornecedorId?: string;
  status?: StatusConta;
  categoriaId?: string;
  formaPagamento?: FormaPagamento;
  vencimento?: RangeData;
}

export interface ContaPagar {
  id: string;
  companyId: string;
  fornecedorId: string;
  fornecedorNome: string;
  documento: string;
  descricao: string;
  categoriaId: string;
  categoriaNome: string;
  valor: number;
  vencimento: string;
  dataPagamento: string | null;
  status: StatusConta;
  formaPagamento: FormaPagamento;
  observacoes?: string;
  criadoEm: string;
  /** Valor original do documento, antes de juros/multa/desconto. */
  valorBruto?: number;
  /** Valor efetivamente pago (null enquanto em aberto). */
  valorPago?: number | null;
  /** Saldo em aberto do título (0 quando quitado). */
  saldo?: number | null;
  /** Data de emissão do título. */
  emissao?: string;
  /** Código interno do título no sistema de origem. */
  codigoTitulo?: string;
  /** Número da parcela (ex.: "124/180"). */
  parcela?: string;
  /** Situação/carteira de origem do pagamento (ex.: "BANCO", "DESPESA FIXA"). */
  banco?: string;
  centroCusto?: string;
  conta?: string;
  /** Fonte do arquivo importado. */
  fonteImportacao?: 'legacy' | 'totvs';
}
