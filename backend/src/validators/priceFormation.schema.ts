import { z } from 'zod';
import { TAX_REGIMES } from '../models/enums';
import { paginationQuery } from '../middlewares/validate';

export const idParam = z.object({ id: z.string().trim().min(1) });

const lineItem = z.object({
  description: z.string().trim().min(1),
  quantity: z.number().min(0).default(1),
  timesPerYear: z.number().min(0).default(12),
  unitCostCents: z.number().int().default(0),
});

const laborLineItem = z.object({
  description: z.string().trim().min(1),
  quantity: z.number().min(0).default(1),
  monthlySalaryCents: z.number().int().min(0).default(0),
  dailyHoursDedication: z.number().min(0).default(8),
  timesPerYear: z.number().min(0).default(12),
});

const taxLineItem = z.object({
  name: z.string().trim().min(1),
  ratePercent: z.number().min(0).default(0),
  note: z.string().trim().optional(),
});

const assetItem = z.object({
  description: z.string().trim().min(1),
  quantity: z.number().min(0).default(1),
  unitCostCents: z.number().int().default(0),
});

const fuelItem = z.object({
  description: z.string().trim().min(1),
  quantity: z.number().min(0).default(1),
  kmPerYear: z.number().min(0).default(0),
  kmPerLiter: z.number().min(0.01).default(1),
  pricePerLiterCents: z.number().int().default(0),
});

const laborBlock = z.object({
  items: z.array(laborLineItem).default([]),
  payrollChargesPercent: z.number().min(0).default(0.6566),
  overtimePercent: z.number().min(0).default(0),
  hazardPayPercent: z.number().min(0).default(0),
  otherAllowancesPercent: z.number().min(0).default(0),
});

const itemsBlock = z.object({ items: z.array(lineItem).default([]) });

const equipmentBlock = z.object({
  items: z.array(assetItem).default([]),
  depreciationPercent: z.number().min(0).max(1).default(0.15),
  capitalMonthlyRatePercent: z.number().min(0).default(0.01),
  capitalPeriodMonths: z.number().min(0).default(12),
});

const taxesBlock = z.object({ items: z.array(taxLineItem).default([]) });

const workingCapitalBlock = z.object({
  receiptTermDays: z.number().min(0).default(30),
  paymentTermDays: z.number().min(0).default(30),
  monthlyFinancialRatePercent: z.number().min(0).default(0),
  otherInitialInvestmentCents: z.number().int().min(0).default(0),
});

const vehicleBlock = z.object({
  depreciationItems: z.array(assetItem).default([]),
  depreciationPercent: z.number().min(0).max(1).default(0.3),
  capitalMonthlyRatePercent: z.number().min(0).default(0.01),
  capitalPeriodMonths: z.number().min(0).default(12),
  maintenanceItems: z.array(lineItem).default([]),
  fuelItems: z.array(fuelItem).default([]),
});

const otherLaborCostsBlock = z.object({
  medicalExpenses: itemsBlock.default({ items: [] }),
  subcontracting: itemsBlock.default({ items: [] }),
});

export const createPriceFormationBody = z.object({
  companyId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  agency: z.string().trim().optional(),
  object: z.string().trim().optional(),
  biddingNumber: z.string().trim().optional(),
  taxRegime: z.enum([...TAX_REGIMES, '']).optional(),
  notes: z.string().trim().optional(),

  directLabor: laborBlock.default({ items: [], payrollChargesPercent: 0.6566, overtimePercent: 0, hazardPayPercent: 0, otherAllowancesPercent: 0 }),
  indirectLabor: laborBlock.default({ items: [], payrollChargesPercent: 0.6566, overtimePercent: 0, hazardPayPercent: 0, otherAllowancesPercent: 0 }),
  medicalAssistance: itemsBlock.default({ items: [] }),
  housingExpense: itemsBlock.default({ items: [] }),
  uniformAndPpe: itemsBlock.default({ items: [] }),
  foodAllowance: itemsBlock.default({ items: [] }),
  otherLaborCosts: otherLaborCostsBlock.default({ medicalExpenses: { items: [] }, subcontracting: { items: [] } }),

  materialsApplication: itemsBlock.default({ items: [] }),
  otherMaterials: itemsBlock.default({ items: [] }),
  equipment: equipmentBlock.default({ items: [], depreciationPercent: 0.15, capitalMonthlyRatePercent: 0.01, capitalPeriodMonths: 12 }),
  vehicles: vehicleBlock.default({
    depreciationItems: [],
    depreciationPercent: 0.3,
    capitalMonthlyRatePercent: 0.01,
    capitalPeriodMonths: 12,
    maintenanceItems: [],
    fuelItems: [],
  }),

  contractMonths: z.number().min(1).default(12),
  unitCount: z.number().min(0).nullable().optional(),
  dailyFullTimeHours: z.number().min(0.1).default(8),
  taxes: taxesBlock.default({ items: [] }),

  contingencyPercent: z.number().min(0).max(0.99).default(0),
  workingCapital: workingCapitalBlock.default({ receiptTermDays: 30, paymentTermDays: 30, monthlyFinancialRatePercent: 0, otherInitialInvestmentCents: 0 }),

  indirectCostsPercent: z.number().min(0).max(0.99).default(0.03),
  profitPercent: z.number().min(0).max(0.99).default(0),
  costBasedTaxesPercent: z.number().min(0).max(0.99).default(0),
  revenueBasedTaxesPercent: z.number().min(0).max(0.99).default(0.1453),
  informedMonthlyRevenueCents: z.number().int().min(0).nullable().optional(),

  referencePriceCents: z.number().int().nullable().optional(),
});
export const updatePriceFormationBody = createPriceFormationBody.partial();

export const listPriceFormationsQuery = z.object({
  companyId: z.string().trim().optional(),
  search: z.string().trim().optional(),
  ...paginationQuery,
});
export type ListPriceFormationsQuery = z.infer<typeof listPriceFormationsQuery>;
