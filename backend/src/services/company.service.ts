import {
  companyHasEntries,
  createCompany,
  findAllCompanies,
  findCompany,
  updateCompany,
} from '../repositories/company.repo';
import { HttpError, conflict, notFound } from '../utils/http';
import { slugify } from '../utils/slug';
import type { CompanyDoc } from '../models/company.model';

function serialize(c: CompanyDoc) {
  return {
    id: c.slug, // o front usa o slug como identificador de empresa
    _id: String(c._id),
    name: c.name,
    shortName: c.shortName,
    document: c.document ?? '',
    status: c.status,
    color: c.color ?? '#0f172a',
    openingBalanceCents: c.openingBalanceCents ?? 0,
    createdAt: c.get('createdAt'),
    updatedAt: c.get('updatedAt'),
  };
}

export async function listCompaniesService() {
  const rows = await findAllCompanies();
  return rows.map(serialize);
}

export async function getCompanyService(idOrSlug: string) {
  const c = await findCompany(idOrSlug);
  if (!c) throw notFound('Empresa não encontrada');
  return serialize(c);
}

export async function createCompanyService(body: any) {
  const slug = body.slug ? slugify(body.slug) : slugify(body.shortName || body.name);
  const existing = await findCompany(slug);
  if (existing) throw conflict(`Já existe uma empresa com o slug "${slug}"`);
  const c = await createCompany({
    name: body.name,
    slug,
    shortName: body.shortName || body.name,
    document: body.document ?? '',
    status: body.status ?? 'ativo',
    color: body.color ?? '#0f172a',
    openingBalanceCents: body.openingBalanceCents ?? 0,
  });
  return serialize(c);
}

export async function updateCompanyService(idOrSlug: string, body: any) {
  const current = await findCompany(idOrSlug);
  if (!current) throw notFound('Empresa não encontrada');
  const data: Record<string, unknown> = {};
  for (const k of ['name', 'shortName', 'document', 'status', 'color', 'openingBalanceCents'] as const) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  const c = await updateCompany(String(current._id), data);
  return serialize(c as CompanyDoc);
}

/** §12: sem regra explícita, não deixa apagar empresa com lançamentos. */
export async function deleteCompanyService(idOrSlug: string) {
  const current = await findCompany(idOrSlug);
  if (!current) throw notFound('Empresa não encontrada');
  if (await companyHasEntries(current._id as any)) {
    throw conflict('Empresa possui lançamentos vinculados e não pode ser removida.');
  }
  throw new HttpError(405, 'Remoção de empresa não é permitida nesta versão do sistema.');
}
