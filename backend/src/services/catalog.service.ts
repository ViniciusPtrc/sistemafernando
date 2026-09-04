import { Category } from '../models/category.model';
import { Receivable } from '../models/receivable.model';
import { Payable } from '../models/payable.model';
import { resolveCompanyObjectId } from '../repositories/company.repo';

let categoryNameCache: Map<string, string> | null = null;

export async function listCategories() {
  const rows = await Category.find().lean().exec();
  return rows.map((c) => ({ id: String(c._id), nome: c.nome, tipo: c.tipo, cor: c.cor }));
}

export async function getCategoryName(id: string): Promise<string> {
  if (!categoryNameCache) {
    const rows = await Category.find().lean().exec();
    categoryNameCache = new Map(rows.map((c) => [String(c._id), c.nome]));
  }
  return categoryNameCache.get(id) ?? 'Outras';
}

export function invalidateCategoryCache(): void {
  categoryNameCache = null;
}

async function distinctParty(model: typeof Receivable | typeof Payable, field: string, companyId?: string) {
  const match: Record<string, unknown> = {};
  const oid = await resolveCompanyObjectId(companyId);
  if (oid) match.companyId = oid;

  const rows = await model.aggregate([
    { $match: match },
    {
      $group: {
        _id: `$${field}`,
        documento: { $first: `$${field === 'customerName' ? 'customerDocument' : 'supplierDocument'}` },
        quantidade: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows
    .filter((r) => r._id)
    .map((r) => ({
      id: r._id as string, // o front usa o próprio nome como identificador
      nome: r._id as string,
      documento: r.documento || '—',
      quantidade: r.quantidade as number,
    }));
}

export function listCustomers(companyId?: string) {
  return distinctParty(Receivable, 'customerName', companyId);
}

export function listSuppliers(companyId?: string) {
  return distinctParty(Payable, 'supplierName', companyId);
}
