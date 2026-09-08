import { z } from 'zod';
import { CONTRACT_STATUS, CONTRACT_COST_TYPES } from '../models/enums';
import { MARGIN_PERIOD_PRESETS } from '../utils/period';
import { paginationQuery, dateStr } from '../middlewares/validate';

export const idParam = z.object({ id: z.string().trim().min(1) });
export const twoIdParam = z.object({ id: z.string().trim().min(1), subId: z.string().trim().min(1) });

const money = z.union([z.number(), z.string()]);

/* --------------------------------- Contratos --------------------------------- */

export const listContractsQuery = z.object({
  companyId: z.string().trim().optional(),
  status: z.enum(CONTRACT_STATUS).optional(),
  customerName: z.string().trim().optional(),
  search: z.string().trim().optional(),
  ...paginationQuery,
});
export type ListContractsQuery = z.infer<typeof listContractsQuery>;

export const createContractBody = z.object({
  companyId: z.string().trim().min(1),
  number: z.string().trim().min(1),
  customerName: z.string().trim().min(1),
  customerDocument: z.string().trim().optional(),
  contractedValue: money.optional(),
  contractedValueCents: z.number().int().optional(),
  startDate: z.string().trim().min(1),
  endDate: z.string().trim().nullable().optional(),
  status: z.enum(CONTRACT_STATUS).optional(),
  notes: z.string().trim().optional(),
});
export const updateContractBody = createContractBody.partial();

/* ------------------------------- Vincular / custos ------------------------------- */

export const linkableQuery = z.object({
  search: z.string().trim().optional(),
  ...paginationQuery,
});

export const linkReceivablesBody = z.object({
  receivableIds: z.array(z.string().trim().min(1)).min(1),
});

export const linkPayablesBody = z.object({
  payableIds: z.array(z.string().trim().min(1)).min(1),
  type: z.enum(CONTRACT_COST_TYPES).default('realizado'),
});

export const createContractCostBody = z.object({
  description: z.string().trim().min(1),
  category: z.string().trim().optional(),
  categoryName: z.string().trim().optional(),
  supplierName: z.string().trim().optional(),
  amount: money.optional(),
  amountCents: z.number().int().optional(),
  date: z.string().trim().min(1),
  type: z.enum(CONTRACT_COST_TYPES).default('realizado'),
  notes: z.string().trim().optional(),
});
export const updateContractCostBody = createContractCostBody.partial();

/* ---------------------------------- Margem ---------------------------------- */

export const marginQuery = z.object({
  period: z.enum(MARGIN_PERIOD_PRESETS).default('ultimos_12_meses'),
  from: dateStr,
  to: dateStr,
  companyId: z.string().trim().optional(),
  contractId: z.string().trim().optional(),
  customerName: z.string().trim().optional(),
  status: z.enum(CONTRACT_STATUS).optional(),
});
export type MarginQuery = z.infer<typeof marginQuery>;

export const marginByContractQuery = marginQuery.extend({
  sort: z
    .enum(['receita', 'custos', 'lucro', 'margem', 'receita_asc', 'custos_asc', 'lucro_asc', 'margem_asc'])
    .default('margem'),
});
