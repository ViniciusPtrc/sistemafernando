import type {
  FiltroHistoricoImportacao,
  FonteImportacao,
  HistoricoImportacao,
  PreviewImportacao,
  ResultadoImportacao,
  TipoImportacao,
} from '@/types';
import { apiGet, apiUpload, buildQuery } from './api';
import type { EnvelopeApi } from './adapters';

function tipoParaApi(tipo: TipoImportacao): 'receivable' | 'payable' {
  return tipo === 'contas_receber' ? 'receivable' : 'payable';
}

function tipoDoApi(type: string): TipoImportacao {
  return type === 'receivable' ? 'contas_receber' : 'contas_pagar';
}

function fonteDoApi(source: string | undefined): FonteImportacao {
  return source === 'totvs' ? 'totvs' : 'legacy';
}

interface PreviewDTO {
  fileName: string;
  companyId: string;
  type: string;
  source: string;
  sourceLabel: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  columns: string[];
  mapping: { sourceColumn: string; field: string }[];
  missingRequired: string[];
  preview: Record<string, string>[];
  errors: { row: number; message: string }[];
  warnings: { row: number; message: string }[];
}

function montarForm(
  tipo: TipoImportacao,
  companyId: string,
  arquivo: File,
  fonte: FonteImportacao,
): FormData {
  const form = new FormData();
  form.set('companyId', companyId);
  form.set('type', tipoParaApi(tipo));
  form.set('source', fonte);
  form.set('file', arquivo);
  return form;
}

export async function gerarPreview(
  tipo: TipoImportacao,
  arquivo: File,
  companyId: string,
  fonte: FonteImportacao,
): Promise<PreviewImportacao> {
  const dto = await apiUpload<PreviewDTO>('/import/preview', montarForm(tipo, companyId, arquivo, fonte));
  return {
    nomeArquivo: dto.fileName,
    companyId: dto.companyId,
    fonte: fonteDoApi(dto.source),
    totalRegistros: dto.validRows,
    colunas: dto.columns,
    linhas: dto.preview,
    mapeamento: (dto.mapping ?? []).map((m) => ({ colunaOrigem: m.sourceColumn, campoSistema: m.field })),
    camposObrigatoriosFaltando: dto.missingRequired ?? [],
    avisos: (dto.warnings ?? []).map((w) => ({ linha: w.row, motivo: w.message })),
    errosParseReal: dto.errors.map((e) => ({ linha: e.row, motivo: e.message })),
  };
}

interface CommitDTO {
  success: boolean;
  source: string;
  total: number;
  inserted: number;
  updated: number;
  ignored: number;
  errors: { row: number; message: string }[];
  warnings: { row: number; message: string }[];
}

export async function importarDados(
  tipo: TipoImportacao,
  companyId: string,
  arquivo: File,
  fonte: FonteImportacao,
): Promise<ResultadoImportacao> {
  const dto = await apiUpload<CommitDTO>('/import', montarForm(tipo, companyId, arquivo, fonte));
  return {
    importados: dto.inserted,
    atualizados: dto.updated,
    ignorados: dto.ignored,
    erros: dto.errors.length,
    detalhesErros: dto.errors.map((e) => `Linha ${e.row}: ${e.message}`),
  };
}

interface ImportLogDTO {
  id: string;
  companyId: string;
  type: string;
  source: string;
  fileName: string;
  insertedRows: number;
  updatedRows: number;
  errorRows: number;
  status: 'processing' | 'completed' | 'completed_with_errors' | 'failed';
  date: string | null;
  createdAt: string | null;
}

function mapStatus(status: ImportLogDTO['status']): HistoricoImportacao['status'] {
  if (status === 'processing') return 'processando';
  if (status === 'failed') return 'erro';
  return 'importado';
}

export async function getHistoricoImportacoes(
  filtro: FiltroHistoricoImportacao = {},
): Promise<HistoricoImportacao[]> {
  const query = buildQuery({
    limit: 50,
    source: filtro.fonte,
    companyId: filtro.companyId && filtro.companyId !== 'all' ? filtro.companyId : undefined,
  });
  const envelope = await apiGet<EnvelopeApi<ImportLogDTO>>(`/imports${query}`);
  return envelope.data.map((r) => ({
    id: r.id,
    data: r.date ?? (r.createdAt ? r.createdAt.slice(0, 10) : ''),
    companyId: r.companyId,
    fonte: fonteDoApi(r.source),
    tipo: tipoDoApi(r.type),
    arquivo: r.fileName,
    registros: r.insertedRows + r.updatedRows,
    status: mapStatus(r.status),
  }));
}
