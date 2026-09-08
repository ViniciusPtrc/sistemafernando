import { Types } from 'mongoose';
import {
  listContracts,
  findContractById,
  createContract,
  updateContract,
  deleteContract,
  listLinkableReceivables,
  listLinkablePayables,
  listContractCosts,
  findContractCostById,
  createContractCost,
  updateContractCost,
  deleteContractCost,
} from '../repositories/contract.repo';
import { Receivable } from '../models/receivable.model';
import { Payable } from '../models/payable.model';
import { resolveCompanyObjectId } from '../repositories/company.repo';
import { getCategoryName } from './catalog.service';
import { parseMoneyToCents } from '../utils/money';
import { ymdToDate, toYMD } from '../utils/dates';
import { HttpError, buildPagination, notFound } from '../utils/http';
import type { ListContractsQuery } from '../validators/contract.schema';

function serializeContract(doc: any) {
  return {
    id: String(doc._id),
    companyId: String(doc.companyId),
    number: doc.number,
    customerName: doc.customerName,
    customerDocument: doc.customerDocument ?? '',
    contractedValueCents: doc.contractedValueCents ?? 0,
    startDate: toYMD(doc.startDate),
    endDate: toYMD(doc.endDate),
    status: doc.status,
    notes: doc.notes ?? '',
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
  };
}

/* --------------------------------- CRUD --------------------------------- */

export async function listContractsService(q: ListContractsQuery) {
  const filter: Record<string, unknown> = {};
  const companyOid = await resolveCompanyObjectId(q.companyId);
  if (companyOid) filter.companyId = companyOid;
  if (q.status) filter.status = q.status;
  if (q.customerName) filter.customerName = q.customerName;
  if (q.search) {
    const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ number: rx }, { customerName: rx }];
  }

  const { data, total } = await listContracts({ filter, page: q.page, limit: q.limit });
  return { data: data.map(serializeContract), pagination: buildPagination(q.page, q.limit, total) };
}

export async function getContractService(id: string) {
  const doc = await findContractById(id);
  if (!doc) throw notFound('Contrato não encontrado');
  return serializeContract(doc);
}

async function normalizeContractBody(body: any) {
  const data: Record<string, unknown> = { ...body };
  if (body.companyId) data.companyId = await resolveCompanyObjectId(body.companyId);

  const cents =
    typeof body.contractedValueCents === 'number'
      ? body.contractedValueCents
      : body.contractedValue !== undefined
        ? parseMoneyToCents(body.contractedValue)
        : undefined;
  if (cents !== undefined) data.contractedValueCents = cents ?? 0;
  delete data.contractedValue;

  if (body.startDate !== undefined) {
    const d = ymdToDate(body.startDate);
    if (!d) throw new HttpError(422, 'startDate inválida (use YYYY-MM-DD)');
    data.startDate = d;
  }
  if (body.endDate !== undefined) data.endDate = body.endDate ? ymdToDate(body.endDate) : null;

  return data;
}

export async function createContractService(body: any) {
  const data = await normalizeContractBody(body);
  try {
    const doc = await createContract(data);
    return serializeContract(doc.toObject());
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw new HttpError(409, 'Já existe um contrato com este número nesta empresa.');
    }
    throw err;
  }
}

export async function updateContractService(id: string, body: any) {
  const existing = await findContractById(id);
  if (!existing) throw notFound('Contrato não encontrado');
  const data = await normalizeContractBody(body);
  const updated = await updateContract(id, data);
  return serializeContract(updated);
}

export async function deleteContractService(id: string) {
  const removed = await deleteContract(id);
  if (!removed) throw notFound('Contrato não encontrado');
  return { success: true, id };
}

/* ------------------------------ Vincular receita ------------------------------ */

export async function listLinkableReceivablesService(contractId: string, page: number, limit: number, search?: string) {
  const contract = await findContractById(contractId);
  if (!contract) throw notFound('Contrato não encontrado');
  const { data, total } = await listLinkableReceivables(contract.companyId as Types.ObjectId, page, limit, search);
  return {
    data: data.map((r: any) => ({
      id: String(r._id),
      customerName: r.customerName,
      documentNumber: r.documentNumber,
      dueDate: toYMD(r.dueDate),
      amountCents: r.amountCents,
      status: r.status,
    })),
    pagination: buildPagination(page, limit, total),
  };
}

export async function linkReceivablesService(contractId: string, receivableIds: string[]) {
  const contract = await findContractById(contractId);
  if (!contract) throw notFound('Contrato não encontrado');
  const result = await Receivable.updateMany(
    { _id: { $in: receivableIds }, companyId: contract.companyId },
    { $set: { contractId: contract._id } },
  );
  return { linked: result.modifiedCount };
}

export async function unlinkReceivableService(contractId: string, receivableId: string) {
  const result = await Receivable.updateOne({ _id: receivableId, contractId }, { $set: { contractId: null } });
  if (!result.matchedCount) throw notFound('Receita não encontrada neste contrato');
  return { success: true };
}

/* -------------------------------- Custos -------------------------------- */

function serializeCost(row: any) {
  const fromPayable = row.origin === 'payable' && row.payable;
  return {
    id: String(row._id),
    contractId: String(row.contractId),
    origin: row.origin,
    type: row.type,
    payableId: row.payableId ? String(row.payableId) : null,
    description: fromPayable ? row.payable.description || row.payable.documentNumber : row.description,
    category: fromPayable ? row.payable.category : row.category,
    categoryName: fromPayable ? row.payable.categoryName : row.categoryName,
    supplierName: fromPayable ? row.payable.supplierName : row.supplierName,
    amountCents: fromPayable ? row.payable.amountCents : row.amountCents,
    date: toYMD(fromPayable ? row.payable.dueDate : row.date),
    notes: row.notes ?? '',
  };
}

export async function listContractCostsService(contractId: string) {
  const contract = await findContractById(contractId);
  if (!contract) throw notFound('Contrato não encontrado');
  const rows = await listContractCosts(contract._id as Types.ObjectId);

  const payableIds = rows.filter((r: any) => r.origin === 'payable' && r.payableId).map((r: any) => r.payableId);
  const payables = payableIds.length ? await Payable.find({ _id: { $in: payableIds } }).lean().exec() : [];
  const payableById = new Map(payables.map((p: any) => [String(p._id), p]));

  return rows.map((row: any) => serializeCost({ ...row, payable: payableById.get(String(row.payableId)) }));
}

export async function listLinkablePayablesService(contractId: string, page: number, limit: number, search?: string) {
  const contract = await findContractById(contractId);
  if (!contract) throw notFound('Contrato não encontrado');
  const { data, total } = await listLinkablePayables(contract.companyId as Types.ObjectId, page, limit, search);
  return {
    data: data.map((p: any) => ({
      id: String(p._id),
      supplierName: p.supplierName,
      documentNumber: p.documentNumber,
      categoryName: p.categoryName,
      dueDate: toYMD(p.dueDate),
      amountCents: p.amountCents,
      status: p.status,
    })),
    pagination: buildPagination(page, limit, total),
  };
}

export async function linkPayablesService(contractId: string, payableIds: string[], type: 'realizado' | 'projetado') {
  const contract = await findContractById(contractId);
  if (!contract) throw notFound('Contrato não encontrado');
  const payables = await Payable.find({ _id: { $in: payableIds }, companyId: contract.companyId }).lean().exec();
  if (!payables.length) return { linked: 0 };

  let linked = 0;
  for (const p of payables) {
    try {
      await createContractCost({ contractId: contract._id, origin: 'payable', payableId: p._id, type });
      linked++;
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err; // já vinculado a algum contrato — ignora
    }
  }
  return { linked };
}

export async function createManualCostService(contractId: string, body: any) {
  const contract = await findContractById(contractId);
  if (!contract) throw notFound('Contrato não encontrado');

  const amountCents = typeof body.amountCents === 'number' ? body.amountCents : parseMoneyToCents(body.amount);
  if (!amountCents || amountCents <= 0) throw new HttpError(422, 'Valor (amount) inválido');

  const date = ymdToDate(body.date);
  if (!date) throw new HttpError(422, 'date inválida (use YYYY-MM-DD)');

  const categoryName = body.category && !body.categoryName ? await getCategoryName(body.category) : body.categoryName;

  const doc = await createContractCost({
    contractId: contract._id,
    origin: 'manual',
    type: body.type ?? 'realizado',
    description: body.description ?? '',
    category: body.category ?? '',
    categoryName: categoryName ?? '',
    supplierName: body.supplierName ?? '',
    amountCents,
    date,
    notes: body.notes ?? '',
  });
  return serializeCost(doc.toObject());
}

export async function updateManualCostService(costId: string, body: any) {
  const existing = await findContractCostById(costId);
  if (!existing) throw notFound('Custo não encontrado');
  if (existing.origin !== 'manual') throw new HttpError(422, 'Só é possível editar custos lançados manualmente. Para um custo vinculado, edite o lançamento original em Contas a Pagar.');

  const data: Record<string, unknown> = { ...body };
  if (body.amountCents !== undefined) data.amountCents = body.amountCents;
  else if (body.amount !== undefined) data.amountCents = parseMoneyToCents(body.amount);
  delete data.amount;

  if (body.date !== undefined) {
    const d = ymdToDate(body.date);
    if (!d) throw new HttpError(422, 'date inválida (use YYYY-MM-DD)');
    data.date = d;
  }
  if (body.category && !body.categoryName) data.categoryName = await getCategoryName(body.category);

  const updated = await updateContractCost(costId, data);
  return serializeCost(updated);
}

export async function deleteCostService(costId: string) {
  const removed = await deleteContractCost(costId);
  if (!removed) throw notFound('Custo não encontrado');
  return { success: true, id: costId };
}
