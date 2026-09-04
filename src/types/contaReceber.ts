import type { FormaPagamento, RangeData, StatusConta } from './common';

export interface FiltroContasReceber {
  busca?: string;
  companyId?: string;
  clienteId?: string;
  status?: StatusConta;
  categoriaId?: string;
  formaPagamento?: FormaPagamento;
  canalCobranca?: string;
  vencimento?: RangeData;
  dataRecebimento?: RangeData;
}

export interface ContaReceber {
  id: string;
  companyId: string;
  clienteId: string;
  clienteNome: string;
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
  /** Valor original do documento, antes de retenções (ISS/INSS/IR) ou ajustes. */
  valorBruto: number;
  /** Valor efetivamente recebido (pode ser null enquanto o título está em aberto). */
  valorRecebido: number | null;
  /** Canal de cobrança do título: Carteira Própria, Banco do Brasil, Banco Itaú, etc. */
  canalCobranca?: string;
  /** Número do contrato de locação vinculado, quando existir. */
  numeroContrato?: string;
  /** Código interno do título no sistema de origem. */
  codigoTitulo?: string;
  /**
   * Proveniência do registro: dado real vindo do dataset inicial embutido no app,
   * dado real vindo de uma importação de planilha nesta sessão, ou dado sintético
   * de demonstração (usado hoje pelas empresas sem fonte real ainda).
   */
  origem: 'dataset_inicial' | 'importacao_excel' | 'sintetico';
  /** Nome do arquivo de origem, quando `origem` for uma importação real. */
  arquivoOrigem?: string;
  /** Fonte do arquivo importado: sistema antigo (`legacy`) ou `totvs`. */
  fonteImportacao?: 'legacy' | 'totvs';
  /** Código do cliente no sistema de origem (ex.: raiz de CNPJ/filial do TOTVS). */
  codigoClienteExterno?: string;
}
