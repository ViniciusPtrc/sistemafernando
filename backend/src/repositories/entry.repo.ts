import { Model, PipelineStage, Types } from 'mongoose';
import { Receivable } from '../models/receivable.model';
import { Payable } from '../models/payable.model';
import { todayUTC } from '../utils/dates';

export type EntryKind = 'receivable' | 'payable';

export function entryModel(kind: EntryKind): Model<any> {
  return (kind === 'receivable' ? Receivable : Payable) as Model<any>;
}

export interface ListEntriesOptions {
  filter: Record<string, unknown>;
  page: number;
  limit: number;
  sort: Record<string, 1 | -1>;
}

export async function listEntries(kind: EntryKind, opts: ListEntriesOptions) {
  const model = entryModel(kind);
  const { filter, page, limit, sort } = opts;
  const [data, total] = await Promise.all([
    model
      .find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec(),
    model.countDocuments(filter).exec(),
  ]);
  return { data, total };
}

export function findEntryById(kind: EntryKind, id: string) {
  return entryModel(kind).findById(id).lean().exec();
}

export function createEntry(kind: EntryKind, data: Record<string, unknown>) {
  return entryModel(kind).create(data);
}

export function updateEntry(kind: EntryKind, id: string, data: Record<string, unknown>) {
  return entryModel(kind)
    .findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .lean()
    .exec();
}

export function deleteEntry(kind: EntryKind, id: string) {
  return entryModel(kind).findByIdAndDelete(id).lean().exec();
}

export function aggregateEntries(kind: EntryKind, pipeline: PipelineStage[]) {
  return entryModel(kind).aggregate(pipeline).exec();
}

/**
 * Expressão que devolve o status "efetivo": um lançamento `pending` cujo
 * vencimento já passou conta como `overdue`. Usado em todos os pipelines.
 */
export function effectiveStatusExpr(now: Date = todayUTC()) {
  return {
    $cond: [
      { $and: [{ $eq: ['$status', 'pending'] }, { $lt: ['$dueDate', now] }] },
      'overdue',
      '$status',
    ],
  };
}

export function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}
