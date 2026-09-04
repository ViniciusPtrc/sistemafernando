import { PipelineStage } from 'mongoose';
import {
  aggregateEntries,
  createEntry,
  deleteEntry,
  effectiveStatusExpr,
  findEntryById,
  listEntries,
  updateEntry,
  type EntryKind,
} from '../repositories/entry.repo';
import { companyMetaMap, resolveCompanyObjectId } from '../repositories/company.repo';
import { serializeEntry, serializeEntryList } from './serialize';
import { HttpError, buildPagination, notFound } from '../utils/http';
import { parseMoneyToCents } from '../utils/money';
import { ymdToDate, todayUTC, toYMD } from '../utils/dates';
import { buildExternalId } from '../imports/externalId';
import { getCategoryName } from './catalog.service';
import type { ListEntryQuery, SummaryQuery } from '../validators/entry.schema';

const SORT_FIELD_MAP: Record<string, string> = {
  vencimento: 'dueDate',
  dueDate: 'dueDate',
  clienteNome: 'customerName',
  customerName: 'customerName',
  fornecedorNome: 'supplierName',
  supplierName: 'supplierName',
  documento: 'documentNumber',
  documentNumber: 'documentNumber',
  categoriaNome: 'categoryName',
  categoryName: 'categoryName',
  valor: 'amountCents',
  amount: 'amountCents',
  amountCents: 'amountCents',
  dataPagamento: 'paymentDate',
  paymentDate: 'paymentDate',
  criadoEm: 'createdAt',
  createdAt: 'createdAt',
  status: 'status',
};

function parseSort(sort: string | undefined): Record<string, 1 | -1> {
  if (!sort) return { dueDate: -1 };
  const [rawField, rawDir] = sort.split(':');
  const field = SORT_FIELD_MAP[(rawField ?? '').trim()] ?? 'dueDate';
  const dir: 1 | -1 = (rawDir ?? '').trim().toLowerCase() === 'asc' ? 1 : -1;
  return { [field]: dir };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface BuiltFilter {
  filter: Record<string, unknown>;
  /** true quando o cliente pediu um status específico (não excluir cancelados por padrão). */
  statusExplicit: boolean;
}

async function buildFilter(kind: EntryKind, q: ListEntryQuery | SummaryQuery): Promise<BuiltFilter> {
  const filter: Record<string, unknown> = {};
  let statusExplicit = false;

  const companyOid = await resolveCompanyObjectId(q.companyId);
  if (companyOid) filter.companyId = companyOid;

  const dueRange: Record<string, Date> = {};
  const now = todayUTC();

  // "Vencido" é status efetivo, não um valor fixo: um título conta como vencido
  // tanto quando foi gravado com `status: 'overdue'` (algumas importações fazem
  // isso) quanto quando está `pending` com vencimento no passado. Filtra pela
  // mesma expressão usada nos resumos para que lista e totais batam.
  const effStatus = effectiveStatusExpr(now);
  if (q.status === 'em_aberto') {
    filter.$expr = { $in: [effStatus, ['pending', 'overdue']] };
    statusExplicit = true;
  } else if (q.status === 'overdue') {
    filter.$expr = { $eq: [effStatus, 'overdue'] };
    statusExplicit = true;
  } else if (q.status === 'pending') {
    filter.$expr = { $eq: [effStatus, 'pending'] }; // "a vencer": aberto e ainda não vencido
    statusExplicit = true;
  } else if (q.status) {
    filter.status = q.status; // paid | canceled — nunca derivados
    statusExplicit = true;
  }

  if (q.category) filter.category = q.category;
  if (q.paymentMethod) filter.paymentMethod = q.paymentMethod;
  if (kind === 'receivable' && q.collectionChannel) filter.collectionChannel = q.collectionChannel;

  const partyField = kind === 'receivable' ? 'customerName' : 'supplierName';
  const party = kind === 'receivable' ? q.customerName : q.supplierName;
  if (party) filter[partyField] = party;

  if (q.search) {
    const rx = new RegExp(escapeRegExp(q.search), 'i');
    filter.$or = [{ [partyField]: rx }, { documentNumber: rx }, { description: rx }];
  }

  const dueGte = ymdToDate(q.dueStart ?? q.startDate ?? undefined);
  const dueLte = ymdToDate(q.dueEnd ?? q.endDate ?? undefined);
  if (dueGte) dueRange.$gte = dueGte;
  if (dueLte) dueRange.$lte = dueLte;
  if (Object.keys(dueRange).length) filter.dueDate = dueRange;

  const payGte = ymdToDate(q.paymentStart ?? undefined);
  const payLte = ymdToDate(q.paymentEnd ?? undefined);
  if (payGte || payLte) {
    filter.paymentDate = { ...(payGte ? { $gte: payGte } : {}), ...(payLte ? { $lte: payLte } : {}) };
  }

  return { filter, statusExplicit };
}

/* --------------------------------- LIST / CRUD --------------------------------- */

export async function listEntriesService(kind: EntryKind, q: ListEntryQuery) {
  const { filter } = await buildFilter(kind, q);
  const sort = parseSort(q.sort);
  const { data, total } = await listEntries(kind, { filter, page: q.page, limit: q.limit, sort });
  const serialized = await serializeEntryList(kind, data);
  return { data: serialized, pagination: buildPagination(q.page, q.limit, total) };
}

export async function getEntryService(kind: EntryKind, id: string) {
  const row = await findEntryById(kind, id);
  if (!row) throw notFound(kind === 'receivable' ? 'Conta a receber não encontrada' : 'Conta a pagar não encontrada');
  return serializeEntry(kind, row);
}

async function normalizeBody(kind: EntryKind, body: any, existing?: any) {
  const data: Record<string, unknown> = { ...body };

  if (body.companyId) data.companyId = await resolveCompanyObjectId(body.companyId);

  const cents =
    typeof body.amountCents === 'number'
      ? body.amountCents
      : body.amount !== undefined
        ? parseMoneyToCents(body.amount)
        : undefined;
  if (cents !== undefined) {
    if (cents === null) throw new HttpError(422, 'Valor (amount) inválido');
    data.amountCents = cents;
  }
  delete data.amount;

  if (kind === 'receivable') {
    if (body.grossAmount !== undefined) data.grossAmountCents = parseMoneyToCents(body.grossAmount) ?? undefined;
    if (body.receivedAmount !== undefined) data.receivedAmountCents = parseMoneyToCents(body.receivedAmount);
    delete data.grossAmount;
    delete data.receivedAmount;
  }

  if (body.dueDate !== undefined) {
    const d = ymdToDate(body.dueDate);
    if (!d) throw new HttpError(422, 'dueDate inválida (use YYYY-MM-DD)');
    data.dueDate = d;
  }
  if (body.paymentDate !== undefined) {
    data.paymentDate = body.paymentDate ? ymdToDate(body.paymentDate) : null;
  }

  if (body.category && !body.categoryName) {
    data.categoryName = await getCategoryName(body.category);
  }

  if (!body.status && !existing && data.dueDate) {
    // nunca grava 'overdue' — pending + vencido é derivado na leitura
    data.status = data.paymentDate ? 'paid' : 'pending';
  }
  // se veio 'overdue' explícito do cliente, normaliza para 'pending'
  if (data.status === 'overdue') data.status = 'pending';

  return data;
}

export async function createEntryService(kind: EntryKind, body: any) {
  const data = await normalizeBody(kind, body);
  data.source = 'manual';

  data.externalId = buildExternalId({
    companyId: String(data.companyId),
    type: kind,
    identifier: body.documentNumber,
  });

  try {
    const doc = await createEntry(kind, data);
    return serializeEntry(kind, doc.toObject());
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw new HttpError(409, 'Já existe um lançamento com este número de documento nesta empresa.');
    }
    throw err;
  }
}

export async function updateEntryService(kind: EntryKind, id: string, body: any) {
  const existing = await findEntryById(kind, id);
  if (!existing) throw notFound('Lançamento não encontrado');
  const data = await normalizeBody(kind, body, existing);
  const updated = await updateEntry(kind, id, data);
  return serializeEntry(kind, updated);
}

export async function deleteEntryService(kind: EntryKind, id: string) {
  const removed = await deleteEntry(kind, id);
  if (!removed) throw notFound('Lançamento não encontrado');
  return { success: true, id };
}

/* --------------------------------- SUMMARIES --------------------------------- */

export async function summaryService(kind: EntryKind, q: SummaryQuery) {
  const { filter, statusExplicit } = await buildFilter(kind, q);
  const now = todayUTC();
  const stages: PipelineStage[] = [
    { $match: filter as Record<string, any> },
    { $addFields: { eff: effectiveStatusExpr(now) } },
  ];
  if (!statusExplicit) stages.push({ $match: { eff: { $ne: 'canceled' } } });

  if (q.group === 'empresa') return summaryByCompany(kind, stages);
  if (q.group === 'cliente') return summaryByParty(kind, stages);
  if (q.group === 'mes') return summaryByMonth(kind, stages);
  return summaryTotals(kind, stages);
}

const recebidoExpr = { $cond: [{ $eq: ['$eff', 'paid'] }, { $ifNull: ['$receivedAmountCents', '$amountCents'] }, 0] };
const vencidoExpr = { $cond: [{ $eq: ['$eff', 'overdue'] }, '$amountCents', 0] };
const aVencerExpr = { $cond: [{ $eq: ['$eff', 'pending'] }, '$amountCents', 0] };

async function summaryTotals(kind: EntryKind, stages: PipelineStage[]) {
  const nameField = kind === 'receivable' ? '$customerName' : '$supplierName';
  const rows = await aggregateEntries(kind, [
    ...stages,
    {
      $group: {
        _id: null,
        quantidadeTitulos: { $sum: 1 },
        totalBruto: { $sum: { $ifNull: ['$grossAmountCents', '$amountCents'] } },
        totalLiquido: { $sum: '$amountCents' },
        recebido: { $sum: recebidoExpr },
        vencido: { $sum: vencidoExpr },
        aVencer: { $sum: aVencerExpr },
        clientes: { $addToSet: nameField },
      },
    },
  ]);
  const r = rows[0] ?? {};
  return {
    quantidadeTitulos: r.quantidadeTitulos ?? 0,
    quantidadeClientes: (r.clientes ?? []).length,
    totalBrutoCents: r.totalBruto ?? 0,
    totalLiquidoCents: r.totalLiquido ?? 0,
    recebidoCents: r.recebido ?? 0,
    emAbertoCents: (r.vencido ?? 0) + (r.aVencer ?? 0),
    vencidoCents: r.vencido ?? 0,
    aVencerCents: r.aVencer ?? 0,
  };
}

async function summaryByCompany(kind: EntryKind, stages: PipelineStage[]) {
  const rows = await aggregateEntries(kind, [
    ...stages,
    {
      $group: {
        _id: '$companyId',
        quantidadeTitulos: { $sum: 1 },
        totalBruto: { $sum: { $ifNull: ['$grossAmountCents', '$amountCents'] } },
        totalLiquido: { $sum: '$amountCents' },
        recebido: { $sum: recebidoExpr },
        vencido: { $sum: vencidoExpr },
        aVencer: { $sum: aVencerExpr },
      },
    },
  ]);
  const meta = await companyMetaMap();
  return rows.map((r: any) => ({
    companyId: meta.get(String(r._id))?.slug ?? String(r._id),
    quantidadeTitulos: r.quantidadeTitulos,
    totalBrutoCents: r.totalBruto,
    totalLiquidoCents: r.totalLiquido,
    recebidoCents: r.recebido,
    emAbertoCents: r.vencido + r.aVencer,
    vencidoCents: r.vencido,
    aVencerCents: r.aVencer,
  }));
}

async function summaryByParty(kind: EntryKind, stages: PipelineStage[]) {
  const nameField = kind === 'receivable' ? '$customerName' : '$supplierName';
  const rows = await aggregateEntries(kind, [
    ...stages,
    {
      $group: {
        _id: nameField,
        quantidadeTitulos: { $sum: 1 },
        totalLiquido: { $sum: '$amountCents' },
        recebido: { $sum: recebidoExpr },
        emAberto: { $sum: { $cond: [{ $in: ['$eff', ['pending', 'overdue']] }, '$amountCents', 0] } },
        vencido: { $sum: vencidoExpr },
        proximoVencimento: { $min: { $cond: [{ $in: ['$eff', ['pending', 'overdue']] }, '$dueDate', null] } },
      },
    },
    { $sort: { emAberto: -1 } },
    { $limit: 300 },
  ]);
  return rows.map((r: any) => ({
    clienteId: String(r._id ?? ''),
    clienteNome: r._id ?? '',
    quantidadeTitulos: r.quantidadeTitulos,
    totalLiquidoCents: r.totalLiquido,
    recebidoCents: r.recebido,
    emAbertoCents: r.emAberto,
    vencidoCents: r.vencido,
    saldoCents: r.emAberto,
    proximoVencimento: toYMD(r.proximoVencimento),
  }));
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

async function summaryByMonth(kind: EntryKind, stages: PipelineStage[]) {
  const rows = await aggregateEntries(kind, [
    ...stages,
    {
      $addFields: {
        refDate: { $cond: [{ $eq: ['$eff', 'paid'] }, { $ifNull: ['$paymentDate', '$dueDate'] }, '$dueDate'] },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$refDate' } },
        recebido: { $sum: recebidoExpr },
        vencido: { $sum: vencidoExpr },
        aVencer: { $sum: aVencerExpr },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r: any) => {
    const [ano, mes] = String(r._id).split('-').map(Number);
    return {
      mes: `${MESES[(mes || 1) - 1]}/${String(ano).slice(2)}`,
      recebidoCents: r.recebido,
      vencidoCents: r.vencido,
      aVencerCents: r.aVencer,
    };
  });
}
