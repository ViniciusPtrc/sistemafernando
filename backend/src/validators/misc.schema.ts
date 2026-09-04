import { z } from 'zod';
import { COMPANY_STATUS, IMPORT_SOURCES } from '../models/enums';
import { dateStr, paginationQuery } from '../middlewares/validate';

export const idOrSlugParam = z.object({ id: z.string().trim().min(1) });

export const createCompanyBody = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().optional(),
  shortName: z.string().trim().optional(),
  document: z.string().trim().optional(),
  status: z.enum(COMPANY_STATUS).optional(),
  color: z.string().trim().optional(),
  openingBalanceCents: z.number().int().optional(),
});
export const updateCompanyBody = createCompanyBody.partial();

export const companyScopedQuery = z.object({ companyId: z.string().trim().optional() });

export const dashboardQuery = z.object({
  companyId: z.string().trim().optional(),
  startDate: dateStr,
  endDate: dateStr,
});

export const comparisonQuery = z.object({
  sort: z.enum(['saldo', 'recebido', 'aReceber', 'aPagar', 'inadimplencia']).optional(),
});

export const cashFlowQuery = z.object({
  companyId: z.string().trim().optional(),
  startDate: dateStr,
  endDate: dateStr,
  groupBy: z.enum(['day', 'week', 'month']).default('month'),
});

export const reportParams = z.object({ type: z.string().trim().min(1) });
export const reportQuery = z.object({
  companyId: z.string().trim().optional(),
  startDate: dateStr,
  endDate: dateStr,
});

export const importListQuery = z.object({
  companyId: z.string().trim().optional(),
  type: z.enum(['receivable', 'payable']).optional(),
  source: z.enum(IMPORT_SOURCES).optional(),
  status: z.enum(['processing', 'completed', 'completed_with_errors', 'failed']).optional(),
  startDate: dateStr,
  endDate: dateStr,
  ...paginationQuery,
});
