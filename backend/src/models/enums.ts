export const ENTRY_STATUS = ['pending', 'paid', 'overdue', 'canceled'] as const;
export type EntryStatus = (typeof ENTRY_STATUS)[number];

export const PAYMENT_METHODS = [
  'boleto',
  'pix',
  'transferencia',
  'cartao_credito',
  'cartao_debito',
  'dinheiro',
  'cheque',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const ENTRY_SOURCES = ['seed_real', 'seed_synthetic', 'import', 'manual'] as const;
export type EntrySource = (typeof ENTRY_SOURCES)[number];

export const IMPORT_TYPES = ['receivable', 'payable'] as const;
export type ImportType = (typeof IMPORT_TYPES)[number];

/**
 * Fonte do arquivo importado. `legacy` = relatório do sistema financeiro antigo
 * (layout "Contas a Receber Anual" + planilhas genéricas). `totvs` = exports do
 * TOTVS. Novas fontes entram aqui — os adaptadores ficam centralizados em
 * `imports/adapters/`, nada de `if fonte === ...` espalhado.
 */
export const IMPORT_SOURCES = ['legacy', 'totvs'] as const;
export type ImportSource = (typeof IMPORT_SOURCES)[number];

export const IMPORT_STATUS = ['processing', 'completed', 'completed_with_errors', 'failed'] as const;
export type ImportStatus = (typeof IMPORT_STATUS)[number];

export const COMPANY_STATUS = ['ativo', 'inativo'] as const;
export type CompanyStatus = (typeof COMPANY_STATUS)[number];

export const CONTRACT_STATUS = ['ativo', 'encerrado', 'cancelado', 'outro'] as const;
export type ContractStatus = (typeof CONTRACT_STATUS)[number];

export const CONTRACT_COST_ORIGINS = ['manual', 'payable'] as const;
export type ContractCostOrigin = (typeof CONTRACT_COST_ORIGINS)[number];

export const CONTRACT_COST_TYPES = ['realizado', 'projetado'] as const;
export type ContractCostType = (typeof CONTRACT_COST_TYPES)[number];

/**
 * Recorrência de um custo manual, usada pela projeção de 36 meses (§Projeção):
 *  - `once`        — lançamento único, cai só no mês de `date`.
 *  - `installment` — compra parcelada: `installments` parcelas de `amountCents`
 *                    a partir do mês de `date` (ex.: 12x → meses 1..12).
 *  - `fixed`       — custo fixo mensal recorrente a partir de `date`, até
 *                    `recurrenceEndDate` (ou fim do horizonte / fim do contrato).
 */
export const CONTRACT_COST_RECURRENCES = ['once', 'installment', 'fixed'] as const;
export type ContractCostRecurrence = (typeof CONTRACT_COST_RECURRENCES)[number];
