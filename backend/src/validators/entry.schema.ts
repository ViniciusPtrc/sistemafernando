import { z } from 'zod';
import { PAYMENT_METHODS } from '../models/enums';
import { paginationQuery, dateStr } from '../middlewares/validate';

/** Status aceitos vindos do front (mistura pt e canônico) -> tratados no service. */
export const statusFilter = z
  .enum(['pending', 'paid', 'overdue', 'canceled', 'em_aberto'])
  .optional();

const commonFilters = {
  companyId: z.string().trim().optional(),
  status: statusFilter,
  category: z.string().trim().optional(),
  customerName: z.string().trim().optional(),
  supplierName: z.string().trim().optional(),
  paymentMethod: z.string().trim().optional(),
  collectionChannel: z.string().trim().optional(),
  search: z.string().trim().optional(),
  startDate: dateStr,
  endDate: dateStr,
  dueStart: dateStr,
  dueEnd: dateStr,
  paymentStart: dateStr,
  paymentEnd: dateStr,
};

export const listEntryQuery = z.object({
  ...commonFilters,
  ...paginationQuery,
});
export type ListEntryQuery = z.infer<typeof listEntryQuery>;

export const summaryQuery = z.object({
  ...commonFilters,
  group: z.enum(['totais', 'empresa', 'cliente', 'mes']).default('totais'),
});
export type SummaryQuery = z.infer<typeof summaryQuery>;

export const idParam = z.object({ id: z.string().trim().min(1) });

const money = z.union([z.number(), z.string()]);

export const createReceivableBody = z.object({
  companyId: z.string().trim().min(1),
  customerName: z.string().trim().min(1),
  customerDocument: z.string().trim().optional(),
  documentNumber: z.string().trim().min(1),
  description: z.string().trim().optional(),
  category: z.string().trim().optional(),
  categoryName: z.string().trim().optional(),
  amount: money.optional(),
  amountCents: z.number().int().optional(),
  grossAmount: money.optional(),
  receivedAmount: money.optional(),
  dueDate: z.string().trim().min(1),
  paymentDate: z.string().trim().nullable().optional(),
  status: z.enum(['pending', 'paid', 'overdue', 'canceled']).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  collectionChannel: z.string().trim().optional(),
  contractNumber: z.string().trim().optional(),
  titleCode: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const createPayableBody = z.object({
  companyId: z.string().trim().min(1),
  supplierName: z.string().trim().min(1),
  supplierDocument: z.string().trim().optional(),
  documentNumber: z.string().trim().min(1),
  description: z.string().trim().optional(),
  category: z.string().trim().optional(),
  categoryName: z.string().trim().optional(),
  amount: money.optional(),
  amountCents: z.number().int().optional(),
  dueDate: z.string().trim().min(1),
  paymentDate: z.string().trim().nullable().optional(),
  status: z.enum(['pending', 'paid', 'overdue', 'canceled']).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  notes: z.string().trim().optional(),
});

export const updateReceivableBody = createReceivableBody.partial();
export const updatePayableBody = createPayableBody.partial();
