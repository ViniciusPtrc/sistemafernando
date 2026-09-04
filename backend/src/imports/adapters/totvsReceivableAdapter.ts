import { parseMoneyToCents, formatBRL } from '../../utils/money';
import { parseDate, toYMD, todayUTC } from '../../utils/dates';
import { cleanText, normalizeText } from '../../utils/slug';
import type { EntryStatus } from '../../models/enums';
import { readSpreadsheet } from '../parseSpreadsheet';
import { buildExternalId } from '../externalId';
import { normalizeReceivableStatus } from '../normalizeStatus';
import type { AdapterContext, SourceAdapter } from './types';
import type { AdapterResult, FieldMapping, ImportKind, NormalizedFinancialRecord, RowError } from '../types/NormalizedFinancialRecord';

// Datas do xlsx chegam como objetos Date em runtime (cellDates:true), embora o
// tipo da matriz não os declare — por isso Date entra aqui.
type Cell = string | number | boolean | Date | null;
type Matrix = Cell[][];

/* ------------------------------ column detection ------------------------------ */

/** normaliza um cabeçalho: sem acento, minúsculo, pontos viram espaço. */
function normHeader(cell: Cell): string {
  return normalizeText(cell).replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
}

type LogicalField =
  | 'titleNumber'
  | 'prefix'
  | 'installment'
  | 'docType'
  | 'titleValue'
  | 'issueDate'
  | 'dueDate'
  | 'dueDateReal'
  | 'settlementDate'
  | 'settledAmount'
  | 'openBalance'
  | 'daysLate'
  | 'situacao';

const SYNONYMS: Record<LogicalField, string[]> = {
  titleNumber: ['no titulo', 'n titulo', 'nº titulo', 'numero titulo', 'num titulo', 'numero do titulo', 'titulo', 'no documento', 'numero documento'],
  prefix: ['prefixo'],
  installment: ['parcela', 'parc'],
  docType: ['tipo', 'tipo titulo', 'tipo do titulo', 'tipo documento', 'especie'],
  titleValue: ['vlr titulo', 'valor titulo', 'valor do titulo', 'vl titulo', 'valor'],
  issueDate: ['dt emissao', 'data emissao', 'emissao', 'data de emissao'],
  dueDate: ['vencimento', 'dt vencimento', 'data vencimento', 'venc', 'data de vencimento'],
  dueDateReal: ['vencto real', 'vencimento real', 'venc real', 'vcto real'],
  settlementDate: ['dt baixa', 'data baixa', 'baixa', 'data da baixa'],
  settledAmount: ['valor baixado', 'vlr baixado', 'vl baixado', 'valor pago'],
  openBalance: ['saldo liquido', 'saldo', 'saldo devedor', 'valor em aberto', 'saldo em aberto'],
  daysLate: ['atraso', 'dias atraso', 'dias em atraso', 'dias de atraso'],
  situacao: ['situacao', 'status', 'situacao titulo', 'situacao do titulo'],
};

const FIELD_ORDER = Object.keys(SYNONYMS) as LogicalField[];

type ColumnIndex = Partial<Record<LogicalField, number>>;

function detectColumns(header: Cell[]): ColumnIndex {
  const norm = header.map(normHeader);
  const map: ColumnIndex = {};
  const used = new Set<number>();

  // passe 1: correspondência exata
  for (const field of FIELD_ORDER) {
    const idx = norm.findIndex((h, i) => h && !used.has(i) && SYNONYMS[field].includes(h));
    if (idx !== -1) {
      map[field] = idx;
      used.add(idx);
    }
  }
  // passe 2: "contém" para os campos mais críticos
  for (const field of ['titleValue', 'dueDate', 'settlementDate', 'settledAmount', 'openBalance'] as LogicalField[]) {
    if (map[field] !== undefined) continue;
    const idx = norm.findIndex(
      (h, i) => h && !used.has(i) && SYNONYMS[field].some((s) => s.length >= 4 && h.includes(s)),
    );
    if (idx !== -1) {
      map[field] = idx;
      used.add(idx);
    }
  }
  return map;
}

function scoreHeaderRow(row: Cell[]): number {
  const norm = row.map(normHeader);
  let score = 0;
  for (const field of FIELD_ORDER) {
    if (norm.some((h) => h && SYNONYMS[field].includes(h))) score += 1;
  }
  return score;
}

/** Acha a linha de cabeçalho (tolera preâmbulo). Devolve índice ou 0. */
function findHeaderRow(matrix: Matrix): number {
  let best = 0;
  let bestScore = 0;
  for (let i = 0; i < Math.min(matrix.length, 15); i++) {
    const s = scoreHeaderRow(matrix[i] ?? []);
    if (s > bestScore) {
      bestScore = s;
      best = i;
    }
  }
  return bestScore >= 3 ? best : 0;
}

/**
 * Heurística de detecção do relatório "Posição de clientes" do TOTVS: cabeçalho
 * com >= 3 campos conhecidos E alguma linha "Dados do cliente:" / "Nome da filial:".
 */
export function looksLikeTotvsPosicao(matrix: Matrix): boolean {
  if (!matrix.length) return false;
  const headerRow = findHeaderRow(matrix);
  if (scoreHeaderRow(matrix[headerRow] ?? []) < 3) return false;
  return matrix
    .slice(headerRow + 1, headerRow + 400)
    .some((row) => /^\s*(dados do cliente|nome da filial):/i.test(String(row?.[0] ?? '')));
}

/* --------------------------------- parsing --------------------------------- */

interface Filial {
  code: string;
  name: string;
}
interface Customer {
  code: string;
  razaoSocial: string;
  fantasia: string;
}

function parseFilial(raw: string): Filial {
  const rest = raw.replace(/^\s*nome da filial:\s*/i, '').trim();
  const m = /^(\S+)\s*-\s*(.+)$/.exec(rest);
  return m ? { code: m[1], name: cleanText(m[2]) } : { code: '', name: cleanText(rest) };
}

function parseCustomer(raw: string): Customer {
  const rest = raw.replace(/^\s*dados do cliente:\s*/i, '').trim();
  const m = /^([0-9./-]+)\s*-\s*(.+?)(?:\s*\(([^)]*)\))?\s*$/.exec(rest);
  if (!m) return { code: '', razaoSocial: cleanText(rest), fantasia: '' };
  let fantasia = cleanText(m[3] ?? '');
  if (/^\*+$/.test(fantasia)) fantasia = '';
  return { code: cleanText(m[1]), razaoSocial: cleanText(m[2]), fantasia };
}

/** "000002974" -> "2974"; número -> string; texto -> limpo. */
function normTitleNumber(raw: Cell): string {
  if (typeof raw === 'number') return Number.isFinite(raw) ? String(Math.trunc(raw)) : '';
  const s = cleanText(raw);
  if (!s) return '';
  return /^\d+$/.test(s) ? String(parseInt(s, 10)) : s;
}

function isBlankRow(row: Cell[] | undefined): boolean {
  return !row || row.every((c) => c === null || c === undefined || c === '');
}

function statusLabelPt(status: EntryStatus): string {
  return status === 'paid' ? 'Recebido' : status === 'overdue' ? 'Vencido' : status === 'canceled' ? 'Cancelado' : 'A vencer';
}

const CATEGORY_ID = 'cat-r-4';
const CATEGORY_NAME = 'Locação';

/**
 * Converte a matriz do relatório "Posição de clientes" do TOTVS em registros
 * normalizados. Núcleo testável (sem I/O).
 */
export function adaptTotvsReceivable(matrix: Matrix, ctx: AdapterContext): AdapterResult {
  const previewCols = ['Cliente', 'Documento', 'Vencimento', 'Valor', 'Status', 'Pagamento'];

  if (!matrix || matrix.length < 2) {
    return {
      candidates: [],
      errors: [{ row: 0, message: 'Planilha vazia ou sem linhas de dados.' }],
      columns: previewCols,
      previewRows: [],
      mapping: [],
      missingRequired: ['Nº do título', 'Valor', 'Vencimento'],
      warnings: [],
    };
  }

  const headerRowIdx = findHeaderRow(matrix);
  const header = matrix[headerRowIdx] ?? [];
  const idx = detectColumns(header);

  const requiredLabels: Record<'titleNumber' | 'titleValue' | 'dueDate', string> = {
    titleNumber: 'Nº do título',
    titleValue: 'Valor',
    dueDate: 'Vencimento',
  };
  const missingRequired = (Object.keys(requiredLabels) as (keyof typeof requiredLabels)[])
    .filter((f) => idx[f] === undefined)
    .map((f) => requiredLabels[f]);

  if (missingRequired.length) {
    return {
      candidates: [],
      errors: missingRequired.map((label) => ({
        row: headerRowIdx + 1,
        message: `Não foi possível identificar a coluna de ${label}.`,
      })),
      columns: previewCols,
      previewRows: [],
      mapping: buildMapping(header, idx),
      missingRequired,
      warnings: [],
    };
  }

  const errors: RowError[] = [];
  const warnings: RowError[] = [];
  const candidates: NormalizedFinancialRecord[] = [];
  const previewRows: Record<string, string>[] = [];
  const today = todayUTC();

  if (idx.situacao === undefined) {
    warnings.push({
      row: 0,
      message:
        'A planilha não tem coluna de situação. O status foi derivado de "Valor baixado" e "Saldo líquido".',
    });
  }

  let currentFilial: Filial | null = null;
  let currentCustomer: Customer | null = null;

  const at = (row: Cell[], field: LogicalField): Cell =>
    idx[field] === undefined ? null : (row[idx[field]!] ?? null);

  for (let i = headerRowIdx + 1; i < matrix.length; i++) {
    const row = matrix[i];
    const rowNum = i + 1;
    const c0 = typeof row?.[0] === 'string' ? (row[0] as string).trim() : '';

    if (/^nome da filial:/i.test(c0)) {
      currentFilial = parseFilial(c0);
      continue;
    }
    if (/^dados do cliente:/i.test(c0)) {
      currentCustomer = parseCustomer(c0);
      continue;
    }
    if (isBlankRow(row)) continue;

    const rawTitle = at(row, 'titleNumber');
    const titleNumberNorm = normTitleNumber(rawTitle);
    const dueDate = parseDate(at(row, 'dueDate'));

    // não é linha de título (rodapé, subtotal solto, etc.)
    if (!titleNumberNorm && !dueDate) continue;
    if (/^total\b/i.test(normalizeText(c0))) continue;

    if (!currentCustomer || !(currentCustomer.razaoSocial || currentCustomer.fantasia)) {
      errors.push({ row: rowNum, message: 'Cliente não identificado.' });
      continue;
    }
    if (!titleNumberNorm) {
      errors.push({ row: rowNum, message: 'Número do título ausente.' });
      continue;
    }

    const amountCents = parseMoneyToCents(at(row, 'titleValue'));
    if (!amountCents || amountCents <= 0) {
      errors.push({ row: rowNum, message: 'Valor inválido.' });
      continue;
    }
    if (!dueDate) {
      errors.push({ row: rowNum, message: 'Data de vencimento inválida.' });
      continue;
    }

    const statusText = idx.situacao !== undefined ? cleanText(at(row, 'situacao')) : '';
    const resolved = normalizeReceivableStatus(statusText);
    if (resolved.unknown) {
      errors.push({ row: rowNum, message: `Status desconhecido: "${resolved.unknown}".` });
      continue;
    }

    const settledCents = parseMoneyToCents(at(row, 'settledAmount')) ?? 0;
    const openCents = idx.openBalance !== undefined ? parseMoneyToCents(at(row, 'openBalance')) : null;
    const settlementDate = parseDate(at(row, 'settlementDate'));

    let status: EntryStatus;
    if (resolved.status) {
      status = resolved.status;
    } else if (settledCents > 0 && (openCents === null || openCents <= 0)) {
      status = 'paid';
    } else {
      status = dueDate < today ? 'overdue' : 'pending';
    }

    const paid = status === 'paid';
    const paymentDate = paid ? settlementDate : null;
    const receivedAmountCents = paid
      ? settledCents > 0
        ? settledCents
        : amountCents
      : settledCents > 0
        ? settledCents
        : null;

    const docType = cleanText(at(row, 'docType'));
    const installment = normTitleNumber(at(row, 'installment'));
    // O nº do título NÃO é único sozinho: repete entre prefixos/tipos diferentes
    // (ex.: ""/DF/2977 vs "A"/NF/2977). A identidade estável do título TOTVS é
    // prefixo + tipo + nº + parcela — é isso que evita duplicar e permite o
    // reimport incremental (§13/§14).
    const prefix = normalizeText(at(row, 'prefix'));
    const identifier = `totvs:${prefix}:${normalizeText(docType)}:${titleNumberNorm}:${installment || '1'}`;

    const noteParts = ['Importado do TOTVS'];
    if (currentFilial?.name) noteParts.push(`Filial ${cleanText(`${currentFilial.code} ${currentFilial.name}`)}`);
    if (currentCustomer.fantasia) noteParts.push(`Fantasia: ${currentCustomer.fantasia}`);

    candidates.push({
      companyObjectId: ctx.companyObjectId,
      kind: 'receivable',
      partyName: currentCustomer.razaoSocial || currentCustomer.fantasia,
      partyDocument: currentCustomer.code,
      documentNumber: titleNumberNorm,
      description: cleanText(`${docType} ${titleNumberNorm}`) || titleNumberNorm,
      category: CATEGORY_ID,
      categoryName: CATEGORY_NAME,
      amountCents,
      grossAmountCents: amountCents,
      receivedAmountCents,
      dueDate,
      paymentDate,
      status,
      paymentMethod: 'boleto',
      collectionChannel: currentFilial?.name ?? '',
      contractNumber: '',
      titleCode: cleanText(rawTitle),
      notes: noteParts.join(' • '),
      externalId: buildExternalId({ companyId: ctx.companyObjectId, type: 'receivable', identifier }),
      source: 'import',
      importSource: 'totvs',
      externalCustomerId: currentCustomer.code,
      sourceFile: ctx.sourceFile,
    });

    if (previewRows.length < 20) {
      previewRows.push({
        Cliente: currentCustomer.razaoSocial || currentCustomer.fantasia,
        Documento: titleNumberNorm,
        Vencimento: toYMD(dueDate) ?? '—',
        Valor: formatBRL(amountCents),
        Status: statusLabelPt(status),
        Pagamento: paymentDate ? toYMD(paymentDate) ?? '—' : '—',
      });
    }
  }

  if (!candidates.length && !errors.length) {
    errors.push({ row: headerRowIdx + 1, message: 'Nenhum título encontrado na planilha.' });
  }

  return {
    candidates,
    errors,
    columns: previewCols,
    previewRows,
    mapping: buildMapping(header, idx),
    missingRequired: [],
    warnings,
  };
}

function buildMapping(header: Cell[], idx: ColumnIndex): FieldMapping[] {
  const mapping: FieldMapping[] = [
    { sourceColumn: 'Dados do cliente:', field: 'Cliente / CNPJ / Código' },
  ];
  const push = (field: LogicalField, label: string) => {
    if (idx[field] !== undefined) {
      mapping.push({ sourceColumn: cleanText(header[idx[field]!]) || label, field: label });
    }
  };
  push('titleNumber', 'Documento');
  push('docType', 'Tipo de documento');
  push('titleValue', 'Valor');
  push('dueDate', 'Vencimento');
  push('settlementDate', 'Data de pagamento');
  push('settledAmount', 'Valor recebido');
  push('openBalance', 'Saldo em aberto');
  push('situacao', 'Status');
  return mapping;
}

/* --------------------------------- adapter --------------------------------- */

async function analyze(
  buffer: Buffer,
  originalName: string,
  ctx: AdapterContext,
): Promise<AdapterResult> {
  const { rows } = await readSpreadsheet(buffer, originalName);
  return adaptTotvsReceivable(rows as Matrix, ctx);
}

export const totvsReceivableAdapter: SourceAdapter = {
  id: 'totvs',
  supports: (kind: ImportKind) => kind === 'receivable',
  analyze,
};
