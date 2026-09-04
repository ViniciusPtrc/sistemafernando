import { Types } from 'mongoose';
import { entryModel } from '../repositories/entry.repo';
import type { ImportSource } from '../models/enums';
import { resolveAdapter } from './ImporterFactory';
import type { EntryCandidate, ImportKind } from './normalize';
import type { AdapterResult, FieldMapping, RowError } from './types/NormalizedFinancialRecord';

export interface PreviewResult {
  source: ImportSource;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  columns: string[];
  preview: Record<string, string>[];
  errors: RowError[];
  warnings: RowError[];
  mapping: FieldMapping[];
  missingRequired: string[];
  /** interno: candidatos já normalizados, reaproveitados no commit */
  _candidates: EntryCandidate[];
}

async function analyze(
  buffer: Buffer,
  originalName: string,
  companyObjectId: string,
  kind: ImportKind,
  source: ImportSource,
): Promise<AdapterResult> {
  const adapter = resolveAdapter(source, kind);
  return adapter.analyze(buffer, originalName, { companyObjectId, kind, sourceFile: originalName });
}

export async function runPreview(
  buffer: Buffer,
  originalName: string,
  companyObjectId: string,
  kind: ImportKind,
  source: ImportSource = 'legacy',
): Promise<PreviewResult> {
  const result = await analyze(buffer, originalName, companyObjectId, kind, source);
  const valid = result.candidates.length;
  const invalid = result.errors.length;
  return {
    source,
    totalRows: valid + invalid,
    validRows: valid,
    invalidRows: invalid,
    columns: result.columns,
    preview: result.previewRows,
    errors: result.errors.slice(0, 200),
    warnings: result.warnings.slice(0, 50),
    mapping: result.mapping,
    missingRequired: result.missingRequired,
    _candidates: result.candidates,
  };
}

export interface CommitResult {
  success: boolean;
  total: number;
  inserted: number;
  updated: number;
  ignored: number;
  errors: RowError[];
}

/** Upsert por (companyId, externalId): reimportar o mesmo arquivo NÃO duplica (§13/§14). */
export async function commitCandidates(
  kind: ImportKind,
  candidates: EntryCandidate[],
): Promise<Omit<CommitResult, 'errors'>> {
  const model = entryModel(kind);
  if (!candidates.length) return { success: true, total: 0, inserted: 0, updated: 0, ignored: 0 };

  const ops = candidates.map((c) => {
    const set: Record<string, unknown> = {
      companyId: new Types.ObjectId(c.companyObjectId),
      documentNumber: c.documentNumber,
      description: c.description,
      category: c.category,
      categoryName: c.categoryName,
      amountCents: c.amountCents,
      dueDate: c.dueDate,
      paymentDate: c.paymentDate,
      // 'overdue' nunca é persistido: é derivado na leitura de (pending + vencido).
      status: c.status === 'overdue' ? 'pending' : c.status,
      paymentMethod: c.paymentMethod,
      notes: c.notes,
      importSource: c.importSource,
      externalCustomerId: c.externalCustomerId,
      sourceFile: c.sourceFile,
    };
    if (kind === 'receivable') {
      set.customerName = c.partyName;
      set.customerDocument = c.partyDocument;
      set.grossAmountCents = c.grossAmountCents;
      set.receivedAmountCents = c.receivedAmountCents;
      set.collectionChannel = c.collectionChannel;
      set.contractNumber = c.contractNumber;
      set.titleCode = c.titleCode;
    } else {
      set.supplierName = c.partyName;
      set.supplierDocument = c.partyDocument;
      set.grossAmountCents = c.grossAmountCents ?? 0;
      set.paidAmountCents = c.paidAmountCents ?? null;
      set.remainingAmountCents = c.remainingAmountCents ?? null;
      set.issueDate = c.issueDate ?? null;
      set.titleCode = c.titleCode ?? '';
      set.installment = c.installment ?? '';
      set.bank = c.bank ?? '';
      set.costCenter = c.costCenter ?? '';
      set.account = c.account ?? '';
    }

    return {
      updateOne: {
        filter: { companyId: new Types.ObjectId(c.companyObjectId), externalId: c.externalId },
        update: { $set: set, $setOnInsert: { externalId: c.externalId, source: 'import', createdAt: new Date() } },
        upsert: true,
      },
    };
  });

  const res = await model.bulkWrite(ops, { ordered: false });
  const inserted = res.upsertedCount ?? 0;
  const updated = res.modifiedCount ?? 0;
  const ignored = candidates.length - inserted - updated;

  return { success: true, total: candidates.length, inserted, updated, ignored: Math.max(0, ignored) };
}
