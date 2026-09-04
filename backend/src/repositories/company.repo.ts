import { Types, isValidObjectId } from 'mongoose';
import { Company, CompanyDoc } from '../models/company.model';
import { Receivable } from '../models/receivable.model';
import { Payable } from '../models/payable.model';

export const ALL = 'all';

export function findAllCompanies(): Promise<CompanyDoc[]> {
  return Company.find().sort({ name: 1 }).exec();
}

export async function findCompany(idOrSlug: string): Promise<CompanyDoc | null> {
  if (isValidObjectId(idOrSlug)) {
    const byId = await Company.findById(idOrSlug).exec();
    if (byId) return byId;
  }
  return Company.findOne({ slug: idOrSlug.toLowerCase() }).exec();
}

/**
 * Traduz o parâmetro `companyId` da API (slug | ObjectId | 'all' | undefined)
 * para um ObjectId. Retorna null quando o escopo é consolidado (todas).
 * Lança quando o slug não existe.
 */
export async function resolveCompanyObjectId(companyId?: string): Promise<Types.ObjectId | null> {
  if (!companyId || companyId === ALL) return null;
  const company = await findCompany(companyId);
  if (!company) {
    const err = new Error(`Empresa não encontrada: "${companyId}"`);
    (err as { status?: number }).status = 404;
    throw err;
  }
  return company._id as Types.ObjectId;
}

export async function companyHasEntries(companyObjectId: Types.ObjectId): Promise<boolean> {
  const [r, p] = await Promise.all([
    Receivable.exists({ companyId: companyObjectId }),
    Payable.exists({ companyId: companyObjectId }),
  ]);
  return Boolean(r || p);
}

export async function createCompany(data: Record<string, unknown>): Promise<CompanyDoc> {
  const doc = await Company.create(data);
  metaCache = null;
  return doc;
}

export async function updateCompany(id: string, data: Record<string, unknown>): Promise<CompanyDoc | null> {
  const doc = await Company.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec();
  metaCache = null;
  return doc;
}

export interface CompanyMeta {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  color: string;
  openingBalanceCents: number;
}

let metaCache: Map<string, CompanyMeta> | null = null;

/** Mapa (ObjectId string) -> metadados da empresa. Cacheado no processo. */
export async function companyMetaMap(): Promise<Map<string, CompanyMeta>> {
  if (metaCache) return metaCache;
  const companies = await Company.find().lean().exec();
  const map = new Map<string, CompanyMeta>();
  for (const c of companies) {
    map.set(String(c._id), {
      id: String(c._id),
      slug: c.slug,
      name: c.name,
      shortName: c.shortName,
      color: c.color ?? '#0f172a',
      openingBalanceCents: c.openingBalanceCents ?? 0,
    });
  }
  metaCache = map;
  return map;
}

export function invalidateCompanyCache(): void {
  metaCache = null;
}
