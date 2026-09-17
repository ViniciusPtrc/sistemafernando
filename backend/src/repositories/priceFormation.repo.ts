import { PriceFormation } from '../models/priceFormation.model';

export interface ListPriceFormationsOptions {
  filter: Record<string, unknown>;
  page: number;
  limit: number;
}

export async function listPriceFormations(opts: ListPriceFormationsOptions) {
  const { filter, page, limit } = opts;
  const [data, total] = await Promise.all([
    PriceFormation.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec(),
    PriceFormation.countDocuments(filter).exec(),
  ]);
  return { data, total };
}

export function findPriceFormationById(id: string) {
  return PriceFormation.findById(id).lean().exec();
}

export function createPriceFormation(data: Record<string, unknown>) {
  return PriceFormation.create(data);
}

export function updatePriceFormation(id: string, data: Record<string, unknown>) {
  return PriceFormation.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean().exec();
}

export function deletePriceFormation(id: string) {
  return PriceFormation.findByIdAndDelete(id).lean().exec();
}
