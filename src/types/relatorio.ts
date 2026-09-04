export type TipoRelatorio =
  | 'contas_pagar'
  | 'contas_receber'
  | 'inadimplencia'
  | 'fluxo_caixa'
  | 'por_cliente'
  | 'por_fornecedor'
  | 'por_categoria'
  | 'resultado_financeiro'
  | 'contas_pagar_por_empresa'
  | 'contas_receber_por_empresa'
  | 'fluxo_caixa_por_empresa'
  | 'inadimplencia_por_empresa'
  | 'resultado_financeiro_por_empresa';

export type GrupoRelatorio = 'geral' | 'empresa';

export interface DefinicaoRelatorio {
  tipo: TipoRelatorio;
  titulo: string;
  descricao: string;
  grupo: GrupoRelatorio;
}
