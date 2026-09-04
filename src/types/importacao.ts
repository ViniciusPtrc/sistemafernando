import type { ContaReceber } from './contaReceber';

export type TipoImportacao = 'contas_pagar' | 'contas_receber';

/** Fonte do arquivo importado. `legacy` = sistema antigo, `totvs` = TOTVS. */
export type FonteImportacao = 'legacy' | 'totvs';

export type StatusImportacao = 'importado' | 'processando' | 'erro';

export interface LinhaPreview {
  [coluna: string]: string | number;
}

export interface ErroLinhaImportacao {
  linha: number;
  motivo: string;
}

/** Um par "coluna do arquivo → campo do sistema" (§16). */
export interface MapeamentoColuna {
  colunaOrigem: string;
  campoSistema: string;
}

export interface PreviewImportacao {
  nomeArquivo: string;
  companyId: string;
  fonte: FonteImportacao;
  totalRegistros: number;
  colunas: string[];
  linhas: LinhaPreview[];
  /** Mapeamento identificado pelo adaptador da fonte. */
  mapeamento: MapeamentoColuna[];
  /** Campos obrigatórios que o sistema não conseguiu localizar no arquivo (§19). */
  camposObrigatoriosFaltando: string[];
  /** Avisos não-bloqueantes (ex.: status derivado por falta de coluna de situação). */
  avisos: ErroLinhaImportacao[];
  /** Presente apenas quando o arquivo foi lido e interpretado de verdade (Contas a Receber, .xls/.xlsx). */
  contasReceberReal?: ContaReceber[];
  errosParseReal?: ErroLinhaImportacao[];
}

export interface ResultadoImportacao {
  importados: number;
  atualizados: number;
  ignorados: number;
  erros: number;
  detalhesErros: string[];
}

export interface HistoricoImportacao {
  id: string;
  data: string;
  companyId: string;
  fonte: FonteImportacao;
  tipo: TipoImportacao;
  arquivo: string;
  registros: number;
  status: StatusImportacao;
}

export interface FiltroHistoricoImportacao {
  fonte?: FonteImportacao;
  companyId?: string;
}
