export type StatusConta = 'em_aberto' | 'pago' | 'vencido' | 'cancelado' | 'recebido' | 'a_vencer';

export type TipoLancamento = 'entrada' | 'saida';

export type FormaPagamento =
  | 'boleto'
  | 'pix'
  | 'transferencia'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'dinheiro'
  | 'cheque';

export type PeriodoPreset =
  | 'hoje'
  | 'esta_semana'
  | 'este_mes'
  | 'mes_anterior'
  | 'ultimos_3_meses'
  | 'personalizado';

export interface RangeData {
  inicio: string;
  fim: string;
}

export interface PeriodoFiltro {
  preset: PeriodoPreset;
  range: RangeData;
}

export interface EventoTimeline {
  titulo: string;
  data: string | null;
  status: 'concluido' | 'pendente' | 'atrasado';
  descricao?: string;
}

export type NivelAlerta = 'critico' | 'atencao' | 'sucesso';

export interface AlertaFinanceiro {
  id: string;
  nivel: NivelAlerta;
  mensagem: string;
  detalhe?: string;
}

export interface OrdenacaoState<T extends string = string> {
  campo: T;
  direcao: 'asc' | 'desc';
}

export interface PaginacaoState {
  pagina: number;
  itensPorPagina: number;
}

export interface RespostaPaginada<T> {
  dados: T[];
  total: number;
  pagina: number;
  itensPorPagina: number;
}

export type FormatoExportacao = 'pdf' | 'excel' | 'csv';
