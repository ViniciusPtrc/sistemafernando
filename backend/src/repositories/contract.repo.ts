import { Types } from 'mongoose';
import { Contract } from '../models/contract.model';
import { ContractCost } from '../models/contractCost.model';
import { Receivable } from '../models/receivable.model';
import { Payable } from '../models/payable.model';

export interface ListContractsOptions {
  filter: Record<string, unknown>;
  page: number;
  limit: number;
}

export async function listContracts(opts: ListContractsOptions) {
  const { filter, page, limit } = opts;
  const [data, total] = await Promise.all([
    Contract.find(filter)
      .sort({ startDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec(),
    Contract.countDocuments(filter).exec(),
  ]);
  return { data, total };
}

export function findContractById(id: string) {
  return Contract.findById(id).lean().exec();
}

export function createContract(data: Record<string, unknown>) {
  return Contract.create(data);
}

export function updateContract(id: string, data: Record<string, unknown>) {
  return Contract.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean().exec();
}

export function deleteContract(id: string) {
  return Contract.findByIdAndDelete(id).lean().exec();
}

/** Receivables da empresa ainda sem contrato vinculado (candidatos a "vincular receita"). */
export async function listLinkableReceivables(companyId: Types.ObjectId, page: number, limit: number, search?: string) {
  const filter: Record<string, unknown> = { companyId, contractId: null };
  if (search) filter.$or = [{ customerName: new RegExp(search, 'i') }, { documentNumber: new RegExp(search, 'i') }];
  const [data, total] = await Promise.all([
    Receivable.find(filter)
      .sort({ dueDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec(),
    Receivable.countDocuments(filter).exec(),
  ]);
  return { data, total };
}

/** Payables da empresa ainda não vinculados a nenhum contrato (candidatos a "vincular custo existente"). */
export async function listLinkablePayables(companyId: Types.ObjectId, page: number, limit: number, search?: string) {
  const linkedIds = await ContractCost.distinct('payableId', { payableId: { $ne: null } });
  const filter: Record<string, unknown> = { companyId, _id: { $nin: linkedIds } };
  if (search) filter.$or = [{ supplierName: new RegExp(search, 'i') }, { documentNumber: new RegExp(search, 'i') }];
  const [data, total] = await Promise.all([
    Payable.find(filter)
      .sort({ dueDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec(),
    Payable.countDocuments(filter).exec(),
  ]);
  return { data, total };
}

export function listContractCosts(contractId: Types.ObjectId) {
  return ContractCost.find({ contractId }).sort({ createdAt: -1 }).lean().exec();
}

export function findContractCostById(id: string) {
  return ContractCost.findById(id).lean().exec();
}

export function createContractCost(data: Record<string, unknown>) {
  return ContractCost.create(data);
}

export function updateContractCost(id: string, data: Record<string, unknown>) {
  return ContractCost.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean().exec();
}

export function deleteContractCost(id: string) {
  return ContractCost.findByIdAndDelete(id).lean().exec();
}
