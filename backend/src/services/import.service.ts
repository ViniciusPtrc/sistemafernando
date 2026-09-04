import { ImportLog } from '../models/importLog.model';
import { companyMetaMap, resolveCompanyObjectId } from '../repositories/company.repo';
import { runPreview, commitCandidates } from '../imports/runImport';
import { toYMD } from '../utils/dates';
import { HttpError } from '../utils/http';
import type { ImportKind } from '../imports/normalize';
import type { ImportSource } from '../models/enums';
import { IMPORT_SOURCE_LABELS } from '../imports/sources';

interface FilePayload {
  buffer: Buffer;
  originalname: string;
}

export async function previewImportService(
  companyId: string,
  type: ImportKind,
  source: ImportSource,
  file?: FilePayload,
) {
  if (!file) throw new HttpError(400, 'Arquivo não enviado (campo "file").');
  const oid = await resolveCompanyObjectId(companyId);
  if (!oid) throw new HttpError(400, 'Selecione uma empresa específica para importar (companyId).');

  const preview = await runPreview(file.buffer, file.originalname, String(oid), type, source);
  return {
    fileName: file.originalname,
    companyId,
    type,
    source: preview.source,
    sourceLabel: IMPORT_SOURCE_LABELS[preview.source],
    totalRows: preview.totalRows,
    validRows: preview.validRows,
    invalidRows: preview.invalidRows,
    columns: preview.columns,
    mapping: preview.mapping,
    missingRequired: preview.missingRequired,
    preview: preview.preview,
    errors: preview.errors,
    warnings: preview.warnings,
  };
}

export async function commitImportService(
  companyId: string,
  type: ImportKind,
  source: ImportSource,
  file?: FilePayload,
) {
  if (!file) throw new HttpError(400, 'Arquivo não enviado (campo "file").');
  const oid = await resolveCompanyObjectId(companyId);
  if (!oid) throw new HttpError(400, 'Selecione uma empresa específica para importar (companyId).');

  const preview = await runPreview(file.buffer, file.originalname, String(oid), type, source);

  if (preview.missingRequired.length && !preview._candidates.length) {
    throw new HttpError(
      422,
      `Não foi possível importar: colunas obrigatórias ausentes (${preview.missingRequired.join(', ')}).`,
    );
  }

  const log = await ImportLog.create({
    companyId: oid,
    type,
    source: preview.source,
    fileName: file.originalname,
    totalRows: preview.totalRows,
    errorRows: preview.invalidRows,
    status: 'processing',
    errors: preview.errors.slice(0, 100),
    warnings: preview.warnings.slice(0, 50),
  });

  try {
    const result = await commitCandidates(type, preview._candidates);
    const status = preview.invalidRows > 0 ? 'completed_with_errors' : 'completed';
    await ImportLog.findByIdAndUpdate(log._id, {
      insertedRows: result.inserted,
      updatedRows: result.updated,
      ignoredRows: result.ignored,
      status,
      finishedAt: new Date(),
    });

    return {
      success: true,
      source: preview.source,
      total: preview._candidates.length,
      inserted: result.inserted,
      updated: result.updated,
      ignored: result.ignored,
      errors: preview.errors,
      warnings: preview.warnings,
    };
  } catch (err) {
    await ImportLog.findByIdAndUpdate(log._id, {
      status: 'failed',
      finishedAt: new Date(),
      errors: [...preview.errors.slice(0, 99), { row: 0, message: (err as Error).message }],
    });
    throw err;
  }
}

export async function listImportsService(query: {
  companyId?: string;
  type?: string;
  source?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}) {
  const filter: Record<string, unknown> = {};
  const oid = await resolveCompanyObjectId(query.companyId);
  if (oid) filter.companyId = oid;
  if (query.type) filter.type = query.type;
  if (query.source) filter.source = query.source;
  if (query.status) filter.status = query.status;
  if (query.startDate || query.endDate) {
    filter.createdAt = {
      ...(query.startDate ? { $gte: new Date(`${query.startDate}T00:00:00.000Z`) } : {}),
      ...(query.endDate ? { $lte: new Date(`${query.endDate}T23:59:59.999Z`) } : {}),
    };
  }

  const [rows, total] = await Promise.all([
    ImportLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean()
      .exec(),
    ImportLog.countDocuments(filter).exec(),
  ]);

  const meta = await companyMetaMap();
  const data = rows.map((r) => {
    const createdAt = (r as { createdAt?: Date }).createdAt ?? null;
    const source = ((r as { source?: string }).source ?? 'legacy') as ImportSource;
    return {
      id: String(r._id),
      companyId: meta.get(String(r.companyId))?.slug ?? String(r.companyId),
      type: r.type,
      source,
      sourceLabel: IMPORT_SOURCE_LABELS[source] ?? source,
      fileName: r.fileName,
      totalRows: r.totalRows,
      insertedRows: r.insertedRows,
      updatedRows: r.updatedRows,
      ignoredRows: r.ignoredRows,
      errorRows: r.errorRows,
      status: r.status,
      errors: r.errors,
      warnings: (r as { warnings?: unknown[] }).warnings ?? [],
      createdAt: createdAt ? new Date(createdAt).toISOString() : null,
      date: toYMD(createdAt),
      finishedAt: r.finishedAt ? new Date(r.finishedAt).toISOString() : null,
    };
  });

  return {
    data,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}
