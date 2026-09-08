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
  | 'natureza'
  | 'settledAmount'
  | 'openBalance'
  | 'daysLate'
  | 'historico'
  | 'portador'
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
  natureza: ['dados da natureza', 'natureza', 'conta', 'plano de contas', 'classificacao'],
  settledAmount: ['valor baixado', 'vlr baixado', 'vl baixado', 'valor pago'],
  openBalance: ['saldo liquido', 'saldo', 'saldo devedor', 'valor em aberto', 'saldo em aberto'],
  daysLate: ['atraso', 'dias atraso', 'dias em atraso', 'dias de atraso'],
  historico: ['historico', 'descricao', 'observacao'],
  portador: ['portador', 'carteira', 'banco'],
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
  for (const field of ['titleValue', 'dueDate', 'settledAmount', 'openBalance'] as LogicalField[]) {
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
 * Heurística de detecção do relatório "Posição de fornecedores" (Contas a
 * Pagar) do TOTVS: cabeçalho com >= 3 campos conhecidos E alguma linha "Dados
 * do fornecedor:" / "Nome da filial:".
 */
export function looksLikeTotvsPosicaoFornecedores(matrix: Matrix): boolean {
  if (!matrix.length) return false;
  const headerRow = findHeaderRow(matrix);
  if (scoreHeaderRow(matrix[headerRow] ?? []) < 3) return false;
  return matrix
    .slice(headerRow + 1, headerRow + 400)
    .some((row) => /^\s*(dados do fornecedor|nome da filial):/i.test(String(row?.[0] ?? '')));
}

/* --------------------------------- parsing --------------------------------- */

interface Filial {
  code: string;
  name: string;
}
interface Supplier {
  code: string;
  razaoSocial: string;
  fantasia: string;
}

function parseFilial(raw: string): Filial {
  const rest = raw.replace(/^\s*nome da filial:\s*/i, '').trim();
  const m = /^(\S+)\s*-\s*(.+)$/.exec(rest);
  return m ? { code: m[1], name: cleanText(m[2]) } : { code: '', name: cleanText(rest) };
}

function parseSupplier(raw: string): Supplier {
  const rest = raw.replace(/^\s*dados do fornecedor:\s*/i, '').trim();
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
  return status === 'paid' ? 'Pago' : status === 'overdue' ? 'Vencido' : status === 'canceled' ? 'Cancelado' : 'A vencer';
}

/** "4.01.001 - EMPRÉSTIMOS BANCÁRIO" -> { id: '4.01.001', nome: 'EMPRÉSTIMOS BANCÁRIO' }. */
function parseNatureza(raw: Cell): { id: string; nome: string } {
  const s = cleanText(raw);
  if (!s) return { id: 'cat-d-10', nome: 'Outras Despesas' };
  const m = /^(\S+)\s*-\s*(.+)$/.exec(s);
  return m ? { id: m[1], nome: cleanText(m[2]) } : { id: s, nome: s };
}

/**
 * Converte a matriz do relatório "Posição de fornecedores" (Contas a Pagar)
 * do TOTVS em registros normalizados. Núcleo testável (sem I/O).
 */
export function adaptTotvsPayable(matrix: Matrix, ctx: AdapterContext): AdapterResult {
  const previewCols = ['Fornecedor', 'Documento', 'Vencimento', 'Valor', 'Status', 'Pagamento'];

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
  if (idx.natureza === undefined) {
    warnings.push({
      row: 0,
      message: 'A planilha não tem coluna de natureza. As despesas foram importadas em "Outras Despesas".',
    });
  }

  let currentFilial: Filial | null = null;
  let currentSupplier: Supplier | null = null;

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
    if (/^dados do fornecedor:/i.test(c0)) {
      currentSupplier = parseSupplier(c0);
      continue;
    }
    if (isBlankRow(row)) continue;

    const rawTitle = at(row, 'titleNumber');
    const titleNumberNorm = normTitleNumber(rawTitle);
    const dueDate = parseDate(at(row, 'dueDate'));

    // não é linha de título (rodapé, subtotal solto, etc.)
    if (!titleNumberNorm && !dueDate) continue;
    if (/^total\b/i.test(normalizeText(c0))) continue;

    if (!currentSupplier || !(currentSupplier.razaoSocial || currentSupplier.fantasia)) {
      errors.push({ row: rowNum, message: 'Fornecedor não identificado.' });
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

    let status: EntryStatus;
    if (resolved.status) {
      status = resolved.status;
    } else if (settledCents > 0 && (openCents === null || openCents <= 0)) {
      status = 'paid';
    } else {
      status = dueDate < today ? 'overdue' : 'pending';
    }

    const paid = status === 'paid';
    // O relatório não traz data de baixa: usa o vencimento real (ou o previsto)
    // como aproximação, igual ao adaptador do sistema antigo para Contas a Pagar.
    const dueDateReal = idx.dueDateReal !== undefined ? parseDate(at(row, 'dueDateReal')) : null;
    const paymentDate = paid ? (dueDateReal ?? dueDate) : null;
    const paidAmountCents = paid ? (settledCents > 0 ? settledCents : amountCents) : settledCents > 0 ? settledCents : null;
    const remainingAmountCents = status === 'paid' ? 0 : (openCents ?? amountCents);

    const issueDate = idx.issueDate !== undefined ? parseDate(at(row, 'issueDate')) : null;
    const docType = cleanText(at(row, 'docType'));
    const installment = normTitleNumber(at(row, 'installment'));
    const historico = cleanText(at(row, 'historico'));
    const natureza = parseNatureza(at(row, 'natureza'));
    // Diferente do "Posição de clientes", aqui o nº do título nem sempre é uma
    // referência de documento: lançamentos de folha (tipo FOL/ADI, prefixo DP)
    // usam códigos genéricos ("MENSAL", "QUINZ", "ENCARGOS"...) repetidos para
    // TODOS os funcionários dentro de um mesmo "fornecedor" (o lote de folha).
    // Prefixo+tipo+nº+parcela sozinho colide nesses casos; fornecedor+valor
    // fecha a identidade sem colidir nos dados reais observados.
    const prefix = normalizeText(at(row, 'prefix'));
    const identifier = `totvs:${currentSupplier.code}:${prefix}:${normalizeText(docType)}:${titleNumberNorm}:${installment || '1'}:${amountCents}`;

    const noteParts = ['Importado do TOTVS'];
    if (currentFilial?.name) noteParts.push(`Filial ${cleanText(`${currentFilial.code} ${currentFilial.name}`)}`);
    if (currentSupplier.fantasia) noteParts.push(`Fantasia: ${currentSupplier.fantasia}`);

    candidates.push({
      companyObjectId: ctx.companyObjectId,
      kind: 'payable',
      partyName: currentSupplier.razaoSocial || currentSupplier.fantasia,
      partyDocument: currentSupplier.code,
      documentNumber: titleNumberNorm,
      description: historico || cleanText(`${docType} ${titleNumberNorm}`) || titleNumberNorm,
      category: natureza.id,
      categoryName: natureza.nome,
      amountCents,
      grossAmountCents: amountCents,
      receivedAmountCents: null,
      paidAmountCents,
      remainingAmountCents,
      dueDate,
      issueDate,
      paymentDate,
      status,
      paymentMethod: 'boleto',
      collectionChannel: '',
      contractNumber: '',
      titleCode: cleanText(rawTitle),
      installment,
      bank: cleanText(at(row, 'portador')),
      costCenter: '',
      account: '',
      notes: noteParts.join(' • '),
      externalId: buildExternalId({ companyId: ctx.companyObjectId, type: 'payable', identifier }),
      source: 'import',
      importSource: 'totvs',
      externalCustomerId: currentSupplier.code,
      sourceFile: ctx.sourceFile,
    });

    if (previewRows.length < 20) {
      previewRows.push({
        Fornecedor: currentSupplier.razaoSocial || currentSupplier.fantasia,
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
    { sourceColumn: 'Dados do fornecedor:', field: 'Fornecedor / CNPJ / Código' },
  ];
  const push = (field: LogicalField, label: string) => {
    if (idx[field] !== undefined) {
      mapping.push({ sourceColumn: cleanText(header[idx[field]!]) || label, field: label });
    }
  };
  push('titleNumber', 'Documento');
  push('docType', 'Tipo de documento');
  push('natureza', 'Categoria');
  push('titleValue', 'Valor');
  push('dueDate', 'Vencimento');
  push('issueDate', 'Emissão');
  push('settledAmount', 'Valor pago');
  push('openBalance', 'Saldo em aberto');
  push('historico', 'Descrição');
  push('portador', 'Banco/Portador');
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
  return adaptTotvsPayable(rows as Matrix, ctx);
}

export const totvsPayableAdapter: SourceAdapter = {
  id: 'totvs',
  supports: (kind: ImportKind) => kind === 'payable',
  analyze,
};
