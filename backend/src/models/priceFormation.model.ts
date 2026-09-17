import { Schema, model, InferSchemaType, HydratedDocument, Types } from 'mongoose';
import { TAX_REGIMES } from './enums';

/**
 * Item de custo genérico: quantidade × vezes/ano × custo unitário.
 * Reaproveitado por várias seções do DFP (assistência médica, moradia, uniforme/EPI,
 * alimentação, materiais, subcontratações…) — cada seção só rotula as colunas diferente
 * na UI (ex.: "usuários"/"peças por usuário" no uniforme).
 */
const lineItemSchema = new Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1 },
    timesPerYear: { type: Number, default: 12 },
    unitCostCents: { type: Number, default: 0 },
  },
  { _id: true },
);

/**
 * `monthlySalaryCents` é o salário-base de tempo integral (jornada de 8h/dia).
 * `dailyHoursDedication` rateia esse valor proporcionalmente à jornada — 4h/dia =
 * 50% do salário-base entra no custo do contrato.
 */
const laborLineItemSchema = new Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1 },
    monthlySalaryCents: { type: Number, default: 0 },
    dailyHoursDedication: { type: Number, default: 8 },
    timesPerYear: { type: Number, default: 12 },
  },
  { _id: true },
);

const taxLineItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    ratePercent: { type: Number, default: 0 },
    note: { type: String, default: '' },
  },
  { _id: true },
);

/** Ativo depreciável (equipamento/veículo): custo de aquisição = quantidade × custo unitário. */
const assetItemSchema = new Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1 },
    unitCostCents: { type: Number, default: 0 },
  },
  { _id: true },
);

const fuelItemSchema = new Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1 },
    kmPerYear: { type: Number, default: 0 },
    kmPerLiter: { type: Number, default: 1 },
    pricePerLiterCents: { type: Number, default: 0 },
  },
  { _id: true },
);

const itemsBlockSchema = new Schema({ items: { type: [lineItemSchema], default: [] } }, { _id: false });
const taxesBlockSchema = new Schema({ items: { type: [taxLineItemSchema], default: [] } }, { _id: false });

const laborBlockSchema = new Schema(
  {
    items: { type: [laborLineItemSchema], default: [] },
    payrollChargesPercent: { type: Number, default: 0.6566 },
    overtimePercent: { type: Number, default: 0 },
    hazardPayPercent: { type: Number, default: 0 },
    otherAllowancesPercent: { type: Number, default: 0 },
  },
  { _id: false },
);

/**
 * Remuneração de capital = custo de aquisição × taxa mensal × período (meses) — igual
 * ao DFP oficial (ex.: 1% ao mês × 12 meses = 12% ao ano sobre o capital imobilizado).
 */
const equipmentBlockSchema = new Schema(
  {
    items: { type: [assetItemSchema], default: [] },
    residualValuePercent: { type: Number, default: 0.85 },
    capitalMonthlyRatePercent: { type: Number, default: 0.01 },
    capitalPeriodMonths: { type: Number, default: 12 },
  },
  { _id: false },
);

const vehicleBlockSchema = new Schema(
  {
    depreciationItems: { type: [assetItemSchema], default: [] },
    residualValuePercent: { type: Number, default: 0.7 },
    capitalMonthlyRatePercent: { type: Number, default: 0.01 },
    capitalPeriodMonths: { type: Number, default: 12 },
    maintenanceItems: { type: [lineItemSchema], default: [] },
    fuelItems: { type: [fuelItemSchema], default: [] },
  },
  { _id: false },
);

/** Despesas médicas de canteiro + subcontratações — rastreadas, mas fora do total de mão-de-obra (ver `computeResultado`). */
const otherLaborCostsBlockSchema = new Schema(
  {
    medicalExpenses: { type: itemsBlockSchema, default: () => ({}) },
    subcontracting: { type: itemsBlockSchema, default: () => ({}) },
  },
  { _id: false },
);

/**
 * Capital de giro, custo financeiro, contingência e investimento inicial — Fase 2.
 * Todos os defaults são neutros (0, ou prazos iguais) para não alterar o preço de
 * simulações já existentes até que o usuário preencha esses parâmetros.
 */
const workingCapitalBlockSchema = new Schema(
  {
    /** Dias entre a prestação do serviço e o recebimento do cliente. */
    receiptTermDays: { type: Number, default: 30 },
    /** Dias entre a compra/execução e o pagamento a fornecedores/folha. */
    paymentTermDays: { type: Number, default: 30 },
    /** Taxa mensal do custo financeiro sobre o capital de giro necessário (ex.: juros de capital de giro). */
    monthlyFinancialRatePercent: { type: Number, default: 0 },
    /** Outros investimentos iniciais não cobertos por equipamentos/veículos (ferramentas, estoque inicial, estrutura…). */
    otherInitialInvestmentCents: { type: Number, default: 0 },
  },
  { _id: false },
);

const priceFormationSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },

    name: { type: String, required: true, trim: true },
    agency: { type: String, default: '' },
    object: { type: String, default: '' },
    biddingNumber: { type: String, default: '' },
    taxRegime: { type: String, enum: [...TAX_REGIMES, ''], default: '' },
    notes: { type: String, default: '' },

    directLabor: { type: laborBlockSchema, default: () => ({}) },
    indirectLabor: { type: laborBlockSchema, default: () => ({}) },
    /** 1.1.3 Assistência médica — rastreada, fora do total de mão-de-obra (ver `computeResultado`). */
    medicalAssistance: { type: itemsBlockSchema, default: () => ({}) },
    /** 1.1.4 Despesa moradia — rastreada, fora do total de mão-de-obra (ver `computeResultado`). */
    housingExpense: { type: itemsBlockSchema, default: () => ({}) },
    /** Uniforme e EPI — entra no total de mão-de-obra. */
    uniformAndPpe: { type: itemsBlockSchema, default: () => ({}) },
    /** Alimentação — entra no total de mão-de-obra. */
    foodAllowance: { type: itemsBlockSchema, default: () => ({}) },
    /** 1.1.7 Outros custos relacionados com mão-de-obra — rastreados, fora do total de mão-de-obra (ver `computeResultado`). */
    otherLaborCosts: { type: otherLaborCostsBlockSchema, default: () => ({}) },

    /** 1.2.1 Materiais de aplicação (consumo recorrente do serviço). */
    materialsApplication: { type: itemsBlockSchema, default: () => ({}) },
    /** 1.2.2 Outros materiais — normalmente um valor fechado vindo de cotação externa (ex.: kit de instalação). */
    otherMaterials: { type: itemsBlockSchema, default: () => ({}) },
    equipment: { type: equipmentBlockSchema, default: () => ({}) },
    vehicles: { type: vehicleBlockSchema, default: () => ({}) },

    /** Duração do contrato em meses — usada para derivar valor mensal/anual. */
    contractMonths: { type: Number, default: 12 },
    /** Quantidade de itens/equipamentos atendidos, opcional — usada para o valor por unidade. */
    unitCount: { type: Number, default: null },
    /** Jornada integral de referência (h/dia) usada para ratear o salário-base pela dedicação parcial ao contrato. */
    dailyFullTimeHours: { type: Number, default: 8 },

    /** Composição documentada dos tributos (ISS/PIS/COFINS/CPRB…) — auditoria, não substitui os percentuais abaixo. */
    taxes: { type: taxesBlockSchema, default: () => ({}) },

    /** % sobre custos diretos, aplicado antes do gross-up — buffer para riscos operacionais. */
    contingencyPercent: { type: Number, default: 0 },
    workingCapital: { type: workingCapitalBlockSchema, default: () => ({}) },

    /** % sobre o PREÇO final (não sobre o custo) — mark-up "por dentro", igual ao DFP oficial. */
    indirectCostsPercent: { type: Number, default: 0.03 },
    profitPercent: { type: Number, default: 0 },
    /** Tributos incidentes sobre o CUSTO (ex.: Simples Nacional), aplicados no mesmo gross-up de indiretos/lucro. */
    costBasedTaxesPercent: { type: Number, default: 0 },
    /** Tributos incidentes sobre a RECEITA (ISS+PIS+COFINS+CPRB…), aplicados no mesmo gross-up de indiretos/lucro. */
    revenueBasedTaxesPercent: { type: Number, default: 0.1453 },

    /**
     * Receita mensal já negociada/informada (opcional) — usada só para a conferência
     * com o "Total dos Serviços" do DFP oficial (replica a lógica da planilha-modelo:
     * o tributo sobre a receita é aplicado sobre este valor informado × 12, não sobre
     * o preço mínimo calculado, para evitar circularidade).
     */
    informedMonthlyRevenueCents: { type: Number, default: null },

    /** Preço-teto do edital/pregão, para comparar com o preço mínimo calculado. */
    referencePriceCents: { type: Number, default: null },
  },
  { timestamps: true },
);

priceFormationSchema.index({ companyId: 1, name: 1 });

export type PriceFormationDoc = HydratedDocument<InferSchemaType<typeof priceFormationSchema>>;
export type PriceFormationPlain = InferSchemaType<typeof priceFormationSchema> & { _id: Types.ObjectId };
export const PriceFormation = model('PriceFormation', priceFormationSchema);
