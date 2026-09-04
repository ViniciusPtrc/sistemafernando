import { readSpreadsheet } from '../parseSpreadsheet';
import { looksLikeErcReceber, parseErcReceber } from '../ercReceberParser';
import { looksLikeErcPagar, parseErcPagar } from '../ercPagarParser';
import { detectColumns, hasRecognizableHeader } from '../columnMap';
import { normalizeErc, normalizeErcPagar, normalizeGeneric } from '../normalize';
import type { AdapterContext, SourceAdapter } from './types';
import type { AdapterResult, ImportKind, NormalizeResult } from '../types/NormalizedFinancialRecord';

const FIELD_LABELS: Record<string, string> = {
  partyName: 'Cliente/Fornecedor',
  partyDocument: 'CPF/CNPJ',
  documentNumber: 'Documento',
  description: 'Descrição',
  category: 'Categoria',
  amount: 'Valor',
  grossAmount: 'Valor bruto',
  dueDate: 'Vencimento',
  paymentDate: 'Data de pagamento',
  status: 'Status',
  paymentMethod: 'Forma de pagamento',
  notes: 'Observações',
};

function withMeta(result: NormalizeResult, mapping: AdapterResult['mapping']): AdapterResult {
  return { ...result, mapping, missingRequired: [], warnings: [] };
}

function mappingFromHeader(header: (string | number | boolean | null)[]): AdapterResult['mapping'] {
  const cols = detectColumns(header);
  return Object.entries(cols)
    .filter(([, idx]) => idx !== undefined)
    .map(([field, idx]) => ({
      sourceColumn: String(header[idx as number] ?? '').trim(),
      field: FIELD_LABELS[field] ?? field,
    }));
}

const ERC_MAPPING: AdapterResult['mapping'] = [
  { sourceColumn: 'Documento', field: 'Documento' },
  { sourceColumn: 'Código do título', field: 'Código do título' },
  { sourceColumn: 'Cliente', field: 'Cliente/Fornecedor' },
  { sourceColumn: 'Vencimento', field: 'Vencimento' },
  { sourceColumn: 'Valor do documento', field: 'Valor' },
  { sourceColumn: 'Data de pagamento', field: 'Data de pagamento' },
];

const ERC_PAGAR_MAPPING: AdapterResult['mapping'] = [
  { sourceColumn: 'Fornecedor', field: 'Fornecedor' },
  { sourceColumn: 'Código Financ.', field: 'Identificador do título' },
  { sourceColumn: 'Documento', field: 'Documento' },
  { sourceColumn: 'Emissão', field: 'Emissão' },
  { sourceColumn: 'Vencto / Previsto: Data', field: 'Vencimento' },
  { sourceColumn: 'Val. Doc.', field: 'Valor bruto' },
  { sourceColumn: 'Previsto: Valor', field: 'Valor' },
  { sourceColumn: 'Aprovado/Pagamento: Valor', field: 'Valor pago' },
  { sourceColumn: 'Sta (2º caractere)', field: 'Status (B = pago)' },
  { sourceColumn: 'Histórico', field: 'Descrição / Categoria' },
];

/**
 * Fonte "Sistema antigo": preserva exatamente o comportamento do pipeline
 * original — assinatura do relatório "Contas a Receber Anual" (parser ERC),
 * senão cabeçalho genérico reconhecível, com fallback para o parser ERC.
 */
async function analyze(
  buffer: Buffer,
  originalName: string,
  ctx: AdapterContext,
): Promise<AdapterResult> {
  const { companyObjectId, kind, sourceFile } = ctx;
  const isXls = /\.xlsx?$/i.test(originalName);

  if (kind === 'receivable' && isXls && looksLikeErcReceber(buffer)) {
    const { registros, erros } = parseErcReceber(buffer);
    return withMeta(normalizeErc(registros, erros, { companyObjectId, sourceFile }), ERC_MAPPING);
  }

  if (kind === 'payable' && isXls && looksLikeErcPagar(buffer)) {
    const { registros, erros } = parseErcPagar(buffer);
    return withMeta(normalizeErcPagar(registros, erros, { companyObjectId, sourceFile }), ERC_PAGAR_MAPPING);
  }

  const { rows } = await readSpreadsheet(buffer, originalName);
  if (rows.length && hasRecognizableHeader(rows[0])) {
    return withMeta(
      normalizeGeneric(rows, { companyObjectId, kind, sourceFile }),
      mappingFromHeader(rows[0]),
    );
  }

  if (kind === 'receivable' && isXls) {
    const { registros, erros } = parseErcReceber(buffer);
    if (registros.length) {
      return withMeta(normalizeErc(registros, erros, { companyObjectId, sourceFile }), ERC_MAPPING);
    }
  }

  if (kind === 'payable' && isXls) {
    const { registros, erros } = parseErcPagar(buffer);
    if (registros.length) {
      return withMeta(normalizeErcPagar(registros, erros, { companyObjectId, sourceFile }), ERC_PAGAR_MAPPING);
    }
  }

  return {
    candidates: [],
    errors: [
      {
        row: 1,
        message:
          'Não foi possível identificar as colunas do arquivo. Verifique o cabeçalho (Cliente/Fornecedor, Documento, Valor, Vencimento).',
      },
    ],
    columns: rows[0]?.map((c) => String(c ?? '')) ?? [],
    previewRows: [],
    mapping: [],
    missingRequired: ['Cliente/Fornecedor', 'Documento', 'Valor', 'Vencimento'],
    warnings: [],
  };
}

export const legacyAdapter: SourceAdapter = {
  id: 'legacy',
  supports: (_kind: ImportKind) => true,
  analyze,
};
