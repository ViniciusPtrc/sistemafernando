import { toYMD, todayUTC } from '../utils/dates';
import { companyMetaMap } from '../repositories/company.repo';
import type { EntryKind } from '../repositories/entry.repo';

function effectiveStatus(row: { status: string; dueDate?: Date | null }): string {
  if (row.status === 'pending' && row.dueDate && new Date(row.dueDate) < todayUTC()) {
    return 'overdue';
  }
  return row.status;
}

export async function serializeEntry(kind: EntryKind, row: any): Promise<Record<string, unknown>> {
  const meta = await companyMetaMap();
  const companySlug = meta.get(String(row.companyId))?.slug ?? String(row.companyId);

  const base: Record<string, unknown> = {
    id: String(row._id),
    companyId: companySlug,
    documentNumber: row.documentNumber,
    description: row.description ?? '',
    category: row.category ?? '',
    categoryName: row.categoryName ?? '',
    amountCents: row.amountCents ?? 0,
    dueDate: toYMD(row.dueDate),
    paymentDate: toYMD(row.paymentDate),
    status: effectiveStatus(row),
    paymentMethod: row.paymentMethod ?? 'boleto',
    notes: row.notes ?? '',
    source: row.source ?? 'manual',
    importSource: row.importSource ?? 'legacy',
    sourceFile: row.sourceFile ?? '',
    externalCustomerId: row.externalCustomerId ?? '',
    externalId: row.externalId,
    createdAt: toYMD(row.createdAt),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };

  if (kind === 'receivable') {
    base.customerName = row.customerName ?? '';
    base.customerDocument = row.customerDocument ?? '';
    base.grossAmountCents = row.grossAmountCents || row.amountCents || 0;
    base.receivedAmountCents = row.receivedAmountCents ?? null;
    base.collectionChannel = row.collectionChannel ?? '';
    base.contractNumber = row.contractNumber ?? '';
    base.titleCode = row.titleCode ?? '';
  } else {
    base.supplierName = row.supplierName ?? '';
    base.supplierDocument = row.supplierDocument ?? '';
    base.grossAmountCents = row.grossAmountCents || row.amountCents || 0;
    base.paidAmountCents = row.paidAmountCents ?? null;
    base.remainingAmountCents = row.remainingAmountCents ?? null;
    base.issueDate = toYMD(row.issueDate);
    base.titleCode = row.titleCode ?? '';
    base.installment = row.installment ?? '';
    base.bank = row.bank ?? '';
    base.costCenter = row.costCenter ?? '';
    base.account = row.account ?? '';
  }

  return base;
}

export async function serializeEntryList(kind: EntryKind, rows: any[]): Promise<Record<string, unknown>[]> {
  return Promise.all(rows.map((r) => serializeEntry(kind, r)));
}
