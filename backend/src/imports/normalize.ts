import { parseMoneyToCents } from '../utils/money';
import { parseDate, todayUTC } from '../utils/dates';
import { cleanText, normalizeText } from '../utils/slug';
import { PAYMENT_METHODS, type PaymentMethod, type ImportSource } from '../models/enums';
import { detectColumns, type CanonicalField } from './columnMap';
import { buildExternalId } from './externalId';
import type { RegistroContaReceberBruto } from './ercReceberParser';
import type { RegistroContaPagarBruto } from './ercPagarParser';
import { categorizeDespesa } from './categorize';

export type ImportKind = 'receivable' | 'payable';

export interface EntryCandidate {
  companyObjectId: string;
  kind: ImportKind;
  partyName: string;
  partyDocument: string;
  documentNumber: string;
  description: string;
  category: string;
  categoryName: string;
  amountCents: number;
  grossAmountCents: number;
  receivedAmountCents: number | null;
  dueDate: Date;
  paymentDate: Date | null;
  status: 'pending' | 'paid' | 'overdue' | 'canceled';
  paymentMethod: PaymentMethod;
  collectionChannel: string;
  contractNumber: string;
  titleCode: string;
  notes: string;
  externalId: string;
  source: 'import';
  /** Fonte concreta do arquivo (legacy | totvs | ...). */
  importSource: ImportSource;
  /** Código do cliente/fornecedor no sistema de origem, quando houver. */
  externalCustomerId: string;
  sourceFile: string;
  /* --- campos específicos de Contas a Pagar (opcionais) --- */
  issueDate?: Date | null;
  paidAmountCents?: number | null;
  remainingAmountCents?: number | null;
  installment?: string;
  bank?: string;
  costCenter?: string;
  account?: string;
}

export interface RowError {
  row: number;
  message: string;
}

export interface NormalizeResult {
  candidates: EntryCandidate[];
  errors: RowError[];
  columns: string[];
  previewRows: Record<string, string>[];
}

function resolveStatus(raw: string | undefined, dueDate: Date, paymentDate: Date | null): EntryCandidate['status'] {
  const s = normalizeText(raw);
  if (['cancelado', 'canceled', 'baixado por cancelamento', 'estornado'].includes(s)) return 'canceled';
  if (paymentDate || ['pago', 'paid', 'recebido', 'liquidado', 'baixado', 'quitado', 'b'].includes(s)) return 'paid';
  return dueDate < todayUTC() ? 'overdue' : 'pending';
}

function resolvePaymentMethod(raw: string | undefined): PaymentMethod {
  const s = normalizeText(raw).replace(/\s+/g, '_');
  const direct = PAYMENT_METHODS.find((m) => m === s);
  if (direct) return direct;
  if (s.includes('pix')) return 'pix';
  if (s.includes('boleto')) return 'boleto';
  if (s.includes('transfer') || s.includes('ted') || s.includes('doc')) return 'transferencia';
  if (s.includes('credito')) return 'cartao_credito';
  if (s.includes('debito')) return 'cartao_debito';
  if (s.includes('dinheiro') || s.includes('especie')) return 'dinheiro';
  if (s.includes('cheque')) return 'cheque';
  return 'boleto';
}

/** Normaliza uma planilha genérica (com cabeçalho reconhecível). */
export function normalizeGeneric(
  matrix: (string | number | boolean | null)[][],
  ctx: { companyObjectId: string; kind: ImportKind; sourceFile: string },
): NormalizeResult {
  const errors: RowError[] = [];
  const candidates: EntryCandidate[] = [];
  const previewRows: Record<string, string>[] = [];

  if (matrix.length < 2) {
    return { candidates, errors: [{ row: 0, message: 'Planilha vazia ou sem linhas de dados' }], columns: [], previewRows };
  }

  const header = matrix[0];
  const cols = detectColumns(header);
  const need: CanonicalField[] = ['partyName', 'documentNumber', 'amount', 'dueDate'];
  const missing = need.filter((f) => cols[f] === undefined);
  if (missing.length) {
    return {
      candidates,
      errors: [{ row: 1, message: `Colunas obrigatórias não encontradas: ${missing.join(', ')}` }],
      columns: header.map((h) => String(h ?? '')),
      previewRows,
    };
  }

  const col = (f: CanonicalField, row: (string | number | boolean | null)[]) =>
    cols[f] === undefined ? undefined : row[cols[f]!];

  const columns = ['Cliente/Fornecedor', 'Documento', 'Vencimento', 'Valor', 'Categoria', 'Pagamento'];

  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.every((c) => c === null || c === '')) continue;
    const rowNum = i + 1;

    const partyName = cleanText(col('partyName', row));
    const documentNumber = cleanText(col('documentNumber', row));
    const amountCents = parseMoneyToCents(col('amount', row) ?? '');
    const dueDate = parseDate(col('dueDate', row) ?? '');

    if (!partyName || !documentNumber || !amountCents || amountCents <= 0 || !dueDate) {
      errors.push({
        row: rowNum,
        message: !amountCents || amountCents <= 0 ? 'valor ausente ou não numérico' : !dueDate ? 'vencimento inválido' : 'nome ou documento ausente',
      });
      continue;
    }

    const paymentDate = parseDate(col('paymentDate', row) ?? '') ?? null;
    const grossCents = parseMoneyToCents(col('grossAmount', row) ?? '') ?? amountCents;
    const status = resolveStatus(cleanText(col('status', row)) || undefined, dueDate, paymentDate);
    const categoryRaw = cleanText(col('category', row));

    const candidate: EntryCandidate = {
      companyObjectId: ctx.companyObjectId,
      kind: ctx.kind,
      partyName,
      partyDocument: cleanText(col('partyDocument', row)),
      documentNumber,
      description: cleanText(col('description', row)),
      category: ctx.kind === 'receivable' ? 'cat-r-5' : 'cat-d-10',
      categoryName: categoryRaw || (ctx.kind === 'receivable' ? 'Outras Receitas' : 'Outras Despesas'),
      amountCents,
      grossAmountCents: grossCents,
      receivedAmountCents: status === 'paid' ? amountCents : null,
      dueDate,
      paymentDate,
      status,
      paymentMethod: resolvePaymentMethod(cleanText(col('paymentMethod', row))),
      collectionChannel: '',
      contractNumber: '',
      titleCode: '',
      notes: cleanText(col('notes', row)),
      externalId: buildExternalId({
        companyId: ctx.companyObjectId,
        type: ctx.kind,
        identifier: documentNumber,
      }),
      source: 'import',
      importSource: 'legacy',
      externalCustomerId: '',
      sourceFile: ctx.sourceFile,
    };
    candidates.push(candidate);

    if (previewRows.length < 20) {
      previewRows.push({
        'Cliente/Fornecedor': partyName,
        Documento: documentNumber,
        Vencimento: dueDate.toISOString().slice(0, 10),
        Valor: (amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        Categoria: candidate.categoryName,
        Pagamento: paymentDate ? paymentDate.toISOString().slice(0, 10) : '—',
      });
    }
  }

  return { candidates, errors, columns, previewRows };
}

/** Normaliza registros do parser do ERP (layout "Contas a Receber Anual"). */
export function normalizeErc(
  registros: RegistroContaReceberBruto[],
  parseErrors: { linha: number; motivo: string }[],
  ctx: { companyObjectId: string; sourceFile: string },
): NormalizeResult {
  const today = todayUTC();
  const candidates: EntryCandidate[] = [];
  const previewRows: Record<string, string>[] = [];

  for (const reg of registros) {
    const dueDate = parseDate(reg.vencimento)!;
    const paymentDate = reg.dataPagamento ? parseDate(reg.dataPagamento) : null;
    const amountCents = Math.round(reg.valorLiquido * 100);
    const status: EntryCandidate['status'] = reg.recebido ? 'paid' : dueDate < today ? 'overdue' : 'pending';

    candidates.push({
      companyObjectId: ctx.companyObjectId,
      kind: 'receivable',
      partyName: cleanText(reg.clienteNome),
      partyDocument: '',
      documentNumber: reg.documento,
      description: 'Aluguel de Equipamentos',
      category: 'cat-r-4',
      categoryName: 'Locação',
      amountCents,
      grossAmountCents: Math.round(reg.valorBruto * 100),
      receivedAmountCents: reg.valorRecebido != null ? Math.round(reg.valorRecebido * 100) : status === 'paid' ? amountCents : null,
      dueDate,
      paymentDate: paymentDate ?? null,
      status,
      paymentMethod: 'boleto',
      collectionChannel: reg.situacaoCarteira ?? '',
      contractNumber: reg.numeroContrato ?? '',
      titleCode: reg.codigoTitulo,
      notes: reg.numeroContrato ? `Contrato nº ${reg.numeroContrato}` : '',
      externalId: buildExternalId({
        companyId: ctx.companyObjectId,
        type: 'receivable',
        identifier: reg.codigoTitulo || reg.documento,
      }),
      source: 'import',
      importSource: 'legacy',
      externalCustomerId: '',
      sourceFile: ctx.sourceFile,
    });

    if (previewRows.length < 20) {
      previewRows.push({
        Cliente: cleanText(reg.clienteNome),
        Documento: reg.documento,
        Vencimento: reg.vencimento,
        Valor: (amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        Categoria: 'Locação',
        Pagamento: reg.dataPagamento ?? '—',
      });
    }
  }

  return {
    candidates,
    errors: parseErrors.map((e) => ({ row: e.linha, message: e.motivo })),
    columns: ['Cliente', 'Documento', 'Vencimento', 'Valor', 'Categoria', 'Pagamento'],
    previewRows,
  };
}

/** Normaliza registros do parser do ERP (layout "Contas a Pagar"). */
export function normalizeErcPagar(
  registros: RegistroContaPagarBruto[],
  parseErrors: { linha: number; motivo: string }[],
  ctx: { companyObjectId: string; sourceFile: string },
): NormalizeResult {
  const today = todayUTC();
  const errors: RowError[] = parseErrors.map((e) => ({ row: e.linha, message: e.motivo }));
  const candidates: EntryCandidate[] = [];
  const previewRows: Record<string, string>[] = [];
  const columns = ['Fornecedor', 'Documento', 'Vencimento', 'Valor', 'Categoria', 'Pagamento'];

  registros.forEach((reg, i) => {
    const rowNum = i + 1;
    const dueDate = parseDate(reg.vencimento);
    const issueDate = reg.emissao ? parseDate(reg.emissao) : null;
    const amountCents = Math.round(reg.valorPrevisto * 100);
    const grossCents = Math.round(reg.valorDocumento * 100) || amountCents;
    const paidCents = reg.pago ? Math.round(reg.valorPago * 100) : null;
    const partyName = cleanText(reg.fornecedorNome);

    if (!partyName || !amountCents || amountCents <= 0 || !dueDate) {
      errors.push({
        row: rowNum,
        message: !partyName
          ? 'Fornecedor não identificado'
          : !amountCents || amountCents <= 0
            ? 'Valor inválido'
            : 'Data de vencimento inválida',
      });
      return;
    }

    const status: EntryCandidate['status'] = reg.pago ? 'paid' : dueDate < today ? 'overdue' : 'pending';
    const paymentDate = reg.pago ? dueDate : null; // relatório não traz data de baixa; usa a data prevista
    const remainingCents = status === 'paid' ? 0 : amountCents;
    const categoria = categorizeDespesa(reg.historico);
    const documentNumber = cleanText(reg.documento) || reg.codigoFinanceiro;
    const notes = [reg.historico, reg.situacao ? `Sit: ${reg.situacao}` : '', reg.anotacao]
      .filter(Boolean)
      .join(' — ');

    candidates.push({
      companyObjectId: ctx.companyObjectId,
      kind: 'payable',
      partyName,
      partyDocument: '',
      documentNumber,
      description: reg.historico || 'Despesa',
      category: categoria.id,
      categoryName: categoria.nome,
      amountCents,
      grossAmountCents: grossCents,
      receivedAmountCents: null,
      paidAmountCents: paidCents,
      remainingAmountCents: remainingCents,
      dueDate,
      issueDate: issueDate ?? null,
      paymentDate,
      status,
      paymentMethod: 'boleto',
      collectionChannel: '',
      contractNumber: '',
      titleCode: reg.codigoFinanceiro,
      installment: reg.parcela ?? '',
      bank: reg.situacao ?? '',
      costCenter: '',
      account: '',
      notes,
      externalId: buildExternalId({
        companyId: ctx.companyObjectId,
        type: 'payable',
        identifier: `legacy:${reg.codigoFinanceiro}`,
      }),
      source: 'import',
      importSource: 'legacy',
      externalCustomerId: '',
      sourceFile: ctx.sourceFile,
    });

    if (previewRows.length < 20) {
      previewRows.push({
        Fornecedor: partyName,
        Documento: documentNumber,
        Vencimento: reg.vencimento,
        Valor: (amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        Categoria: categoria.nome,
        Pagamento: reg.pago ? 'Pago' : status === 'overdue' ? 'Vencido' : 'Em aberto',
      });
    }
  });

  return { candidates, errors, columns, previewRows };
}
