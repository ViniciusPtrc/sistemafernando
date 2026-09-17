import {
  listPriceFormations,
  findPriceFormationById,
  createPriceFormation,
  updatePriceFormation,
  deletePriceFormation,
} from '../repositories/priceFormation.repo';
import { resolveCompanyObjectId } from '../repositories/company.repo';
import { buildPagination, notFound } from '../utils/http';
import type { ListPriceFormationsQuery } from '../validators/priceFormation.schema';

/* --------------------------------- Cálculo --------------------------------- */
/**
 * Espelha a estrutura e as fórmulas da planilha-modelo "Planilha de Custos e Formação
 * de Preços" (DFP), aba "REAL (2)", célula a célula, incluindo duas particularidades
 * confirmadas também na aba "REAL" (ou seja, não é erro isolado de digitação — é como
 * o modelo da empresa calcula, e reproduzimos de propósito para bater com o valor já
 * entregue ao órgão):
 *
 * 1) O total de mão-de-obra (linha "TOTAL 1.1.") soma direta + indireta + uniforme/EPI
 *    + alimentação, mas NÃO soma assistência médica, moradia e outros custos
 *    relacionados (despesas médicas de canteiro + subcontratações) — esses ficam
 *    rastreados/exibidos, mas fora do total.
 * 2) O "Subtotal 1.A" (materiais + equipamentos + veículos) soma, além desses três,
 *    só o PRIMEIRO item da lista de uniforme/EPI (na planilha, uma referência fixa à
 *    célula da primeira linha, "Bota") — não o total da seção de uniforme/EPI, que já
 *    entrou no total de mão-de-obra acima. Isso causa contagem duplicada do primeiro
 *    item de uniforme, replicada aqui de propósito.
 */

interface LineItem {
  description: string;
  quantity: number;
  timesPerYear: number;
  unitCostCents: number;
}

interface LaborLineItem {
  description: string;
  quantity: number;
  monthlySalaryCents: number;
  dailyHoursDedication: number;
  timesPerYear: number;
}

interface AssetItem {
  description: string;
  quantity: number;
  unitCostCents: number;
}

interface FuelItem {
  description: string;
  quantity: number;
  kmPerYear: number;
  kmPerLiter: number;
  pricePerLiterCents: number;
}

interface LaborBlock {
  items: LaborLineItem[];
  payrollChargesPercent: number;
  overtimePercent: number;
  hazardPayPercent: number;
  otherAllowancesPercent: number;
}

interface EquipmentBlock {
  items: AssetItem[];
  depreciationPercent: number;
  capitalMonthlyRatePercent: number;
  capitalPeriodMonths: number;
}

interface VehicleBlock extends EquipmentBlock {
  depreciationItems: AssetItem[];
  maintenanceItems: LineItem[];
  fuelItems: FuelItem[];
}

interface WorkingCapitalBlock {
  receiptTermDays: number;
  paymentTermDays: number;
  monthlyFinancialRatePercent: number;
  otherInitialInvestmentCents: number;
}

function itemLineTotalCents(i: LineItem): number {
  return Math.round(i.quantity * i.timesPerYear * i.unitCostCents);
}

function sumLineItems(items: LineItem[] | undefined): number {
  return (items ?? []).reduce((sum, i) => sum + itemLineTotalCents(i), 0);
}

/** `dailyFullTimeHours` é a jornada integral de referência (h/dia), configurável por simulação — usada para ratear o salário-base pela dedicação parcial ao contrato. */
function sumLaborItems(items: LaborLineItem[] | undefined, dailyFullTimeHours: number): number {
  return (items ?? []).reduce(
    (sum, i) => sum + Math.round(i.quantity * i.timesPerYear * (i.monthlySalaryCents ?? 0) * ((i.dailyHoursDedication ?? dailyFullTimeHours) / dailyFullTimeHours)),
    0,
  );
}

function sumAssetAcquisition(items: AssetItem[] | undefined): number {
  return (items ?? []).reduce((sum, i) => sum + Math.round(i.quantity * i.unitCostCents), 0);
}

function sumFuel(items: FuelItem[] | undefined): number {
  return (items ?? []).reduce((sum, i) => sum + Math.round((i.quantity * i.kmPerYear * i.pricePerLiterCents) / (i.kmPerLiter || 1)), 0);
}

/** Cada adicional é uma linha em R$ separada sobre o subtotal, somada ao final — igual à planilha-modelo do DFP. */
function computeLaborBlock(block: LaborBlock | undefined, dailyFullTimeHours: number) {
  const b = block ?? { items: [], payrollChargesPercent: 0, overtimePercent: 0, hazardPayPercent: 0, otherAllowancesPercent: 0 };
  const subtotalCents = sumLaborItems(b.items, dailyFullTimeHours);
  const payrollChargesValueCents = Math.round(subtotalCents * (b.payrollChargesPercent ?? 0));
  const overtimeValueCents = Math.round(subtotalCents * (b.overtimePercent ?? 0));
  const hazardPayValueCents = Math.round(subtotalCents * (b.hazardPayPercent ?? 0));
  const otherAllowancesValueCents = Math.round(subtotalCents * (b.otherAllowancesPercent ?? 0));
  const totalCents = subtotalCents + payrollChargesValueCents + overtimeValueCents + hazardPayValueCents + otherAllowancesValueCents;
  return { subtotalCents, payrollChargesValueCents, overtimeValueCents, hazardPayValueCents, otherAllowancesValueCents, totalCents };
}

/**
 * Depreciação = custo de aquisição × depreciationPercent (direto, ex.: 15%). Remuneração
 * de capital = custo de aquisição × taxa mensal × período (meses) — replica o DFP
 * oficial (ex.: 1%/mês × 12 meses = 12% ao ano sobre o capital imobilizado), em vez de
 * um percentual anual único. São dois blocos separados (1.3.1/1.3.2 ou 1.4.1/1.4.2).
 */
function computeAssetBlock(items: AssetItem[] | undefined, depreciationPercent: number, capitalMonthlyRatePercent: number, capitalPeriodMonths: number) {
  const acquisitionCostCents = sumAssetAcquisition(items);
  const depreciationCents = Math.round(acquisitionCostCents * (depreciationPercent ?? 0));
  const residualValueCents = acquisitionCostCents - depreciationCents;
  const capitalReturnCents = Math.round(acquisitionCostCents * (capitalMonthlyRatePercent ?? 0) * (capitalPeriodMonths ?? 0));
  const totalCents = depreciationCents + capitalReturnCents;
  return { acquisitionCostCents, residualValueCents, depreciationCents, capitalReturnCents, totalCents };
}

export function computeResultado(doc: any) {
  const dailyFullTimeHours = doc.dailyFullTimeHours || 8;
  const directLabor = computeLaborBlock(doc.directLabor, dailyFullTimeHours);
  const indirectLabor = computeLaborBlock(doc.indirectLabor, dailyFullTimeHours);

  const medicalAssistanceCents = sumLineItems(doc.medicalAssistance?.items);
  const housingExpenseCents = sumLineItems(doc.housingExpense?.items);
  const uniformAndPpeItems: LineItem[] = doc.uniformAndPpe?.items ?? [];
  const uniformAndPpeCents = sumLineItems(uniformAndPpeItems);
  const foodAllowanceCents = sumLineItems(doc.foodAllowance?.items);
  const otherLaborMedicalCents = sumLineItems(doc.otherLaborCosts?.medicalExpenses?.items);
  const otherLaborSubcontractingCents = sumLineItems(doc.otherLaborCosts?.subcontracting?.items);
  const otherLaborCostsCents = otherLaborMedicalCents + otherLaborSubcontractingCents;

  /** Bug-compatível com a planilha-modelo (ver comentário no topo do arquivo): exclui assistência médica, moradia e outros custos. */
  const laborTotalCents = directLabor.totalCents + indirectLabor.totalCents + uniformAndPpeCents + foodAllowanceCents;

  const materialsApplicationCents = sumLineItems(doc.materialsApplication?.items);
  const otherMaterialsCents = sumLineItems(doc.otherMaterials?.items);
  const materialsTotalCents = materialsApplicationCents + otherMaterialsCents;

  const equipment = computeAssetBlock(
    doc.equipment?.items,
    doc.equipment?.depreciationPercent ?? 0,
    doc.equipment?.capitalMonthlyRatePercent ?? 0,
    doc.equipment?.capitalPeriodMonths ?? 0,
  );

  const vehicleDepreciation = computeAssetBlock(
    doc.vehicles?.depreciationItems,
    doc.vehicles?.depreciationPercent ?? 0,
    doc.vehicles?.capitalMonthlyRatePercent ?? 0,
    doc.vehicles?.capitalPeriodMonths ?? 0,
  );
  const vehicleMaintenanceCents = sumLineItems(doc.vehicles?.maintenanceItems);
  const vehicleFuelCents = sumFuel(doc.vehicles?.fuelItems);
  const vehiclesTotalCents = vehicleDepreciation.totalCents + vehicleMaintenanceCents + vehicleFuelCents;

  /** Bug-compatível: só o primeiro item de uniforme/EPI "vaza" para o subtotal — ver comentário no topo do arquivo. */
  const firstUniformItemCents = uniformAndPpeItems.length > 0 ? itemLineTotalCents(uniformAndPpeItems[0]) : 0;
  const materialsAndEquipmentSubtotalCents = vehiclesTotalCents + equipment.totalCents + materialsTotalCents + firstUniformItemCents;

  const directCostsCents = laborTotalCents + materialsAndEquipmentSubtotalCents;

  const contractMonths = doc.contractMonths || 12;

  /** % sobre os custos diretos, aplicado antes do gross-up — buffer para riscos operacionais (peças, combustível, produtividade…). */
  const contingencyPercent = doc.contingencyPercent ?? 0;
  const contingencyValueCents = Math.round(directCostsCents * contingencyPercent);

  /**
   * Capital de giro: baseado só nos custos operacionais que geram desembolso de caixa
   * (mão de obra, materiais, manutenção e combustível) — depreciação e remuneração de
   * capital são registros contábeis, não saída de caixa, então ficam de fora para
   * evitar circularidade com o próprio preço (administração/tributos dependem do preço).
   */
  const wc: WorkingCapitalBlock = doc.workingCapital ?? { receiptTermDays: 30, paymentTermDays: 30, monthlyFinancialRatePercent: 0, otherInitialInvestmentCents: 0 };
  const cashCostAnnualCents = laborTotalCents + materialsTotalCents + vehicleMaintenanceCents + vehicleFuelCents;
  const monthlyCashCostCents = Math.round(cashCostAnnualCents / contractMonths);
  const netTermDays = Math.max(0, (wc.receiptTermDays ?? 30) - (wc.paymentTermDays ?? 30));
  const workingCapitalNeededCents = Math.round((monthlyCashCostCents * netTermDays) / 30);

  /** Custo financeiro = capital de giro necessário × taxa mensal × duração do contrato. */
  const financialCostCents = Math.round(workingCapitalNeededCents * (wc.monthlyFinancialRatePercent ?? 0) * contractMonths);

  const costsBaseForPriceCents = directCostsCents + contingencyValueCents + financialCostCents;

  const indirectCostsPercent = doc.indirectCostsPercent ?? 0;
  const profitPercent = doc.profitPercent ?? 0;
  const costBasedTaxesPercent = doc.costBasedTaxesPercent ?? 0;
  const revenueBasedTaxesPercent = doc.revenueBasedTaxesPercent ?? 0;
  const taxesPercent = costBasedTaxesPercent + revenueBasedTaxesPercent;
  const k = indirectCostsPercent + profitPercent + taxesPercent;

  const minimumPriceCents = k < 1 ? Math.round(costsBaseForPriceCents / (1 - k)) : null;
  const indirectCostsValueCents = minimumPriceCents === null ? 0 : Math.round(indirectCostsPercent * minimumPriceCents);
  const profitValueCents = minimumPriceCents === null ? 0 : Math.round(profitPercent * minimumPriceCents);
  const taxesValueCents = minimumPriceCents === null ? 0 : Math.round(taxesPercent * minimumPriceCents);

  /** Mesma fórmula do preço mínimo, mas sem a parcela de lucro — preço em que o resultado econômico é zero. */
  const kBreakeven = indirectCostsPercent + taxesPercent;
  const breakevenPriceCents = kBreakeven < 1 ? Math.round(costsBaseForPriceCents / (1 - kBreakeven)) : null;

  /** Lucro sobre o custo total (diretos + contingência + financeiro + indiretos + tributos) — distinto da margem, que é sobre o preço. */
  const costTotalExcludingProfitCents = costsBaseForPriceCents + indirectCostsValueCents + taxesValueCents;
  const markupPercent = minimumPriceCents !== null && costTotalExcludingProfitCents > 0 ? (profitValueCents / costTotalExcludingProfitCents) * 100 : null;

  /** Investimento inicial = aquisição de equipamentos + veículos + capital de giro + outros investimentos declarados. */
  const initialInvestmentCents = equipment.acquisitionCostCents + vehicleDepreciation.acquisitionCostCents + workingCapitalNeededCents + (wc.otherInitialInvestmentCents ?? 0);
  const roiTotalPercent = minimumPriceCents !== null && initialInvestmentCents > 0 ? (profitValueCents / initialInvestmentCents) * 100 : null;
  const roiAnnualPercent = roiTotalPercent === null ? null : roiTotalPercent / (contractMonths / 12);
  const paybackMonths = minimumPriceCents !== null && profitValueCents > 0 ? initialInvestmentCents / (profitValueCents / contractMonths) : null;

  const monthlyValueCents = minimumPriceCents === null ? null : Math.round(minimumPriceCents / contractMonths);
  const annualValueCents = monthlyValueCents === null ? null : monthlyValueCents * 12;
  const unitCount = doc.unitCount ?? null;
  const valuePerUnitCents = minimumPriceCents === null || !unitCount ? null : Math.round(minimumPriceCents / unitCount);

  const dre = minimumPriceCents === null
    ? []
    : [
        { label: 'Faturamento (preço total)', valorCents: minimumPriceCents },
        { label: '(-) Tributos', valorCents: -taxesValueCents },
        { label: '(-) Mão de obra', valorCents: -laborTotalCents },
        { label: '(-) Materiais', valorCents: -materialsTotalCents },
        { label: '(-) Equipamentos', valorCents: -equipment.totalCents },
        { label: '(-) Veículos', valorCents: -vehiclesTotalCents },
        { label: '(-) Contingência/Risco', valorCents: -contingencyValueCents },
        { label: '(-) Custo financeiro', valorCents: -financialCostCents },
        { label: '(-) Custos indiretos (administração)', valorCents: -indirectCostsValueCents },
        { label: '(=) Lucro', valorCents: profitValueCents },
      ].map((l) => ({ ...l, percentualDaReceita: minimumPriceCents > 0 ? (l.valorCents / minimumPriceCents) * 100 : 0 }));

  const referencePriceCents = doc.referencePriceCents ?? null;
  let comparacaoReferencia = null;
  if (referencePriceCents !== null && referencePriceCents > 0) {
    const lucroRealCents = Math.round(referencePriceCents * (1 - indirectCostsPercent - taxesPercent)) - costsBaseForPriceCents;
    comparacaoReferencia = {
      referencePriceCents,
      lucroRealCents,
      margemRealPct: (lucroRealCents / referencePriceCents) * 100,
      viavel: minimumPriceCents !== null && referencePriceCents >= minimumPriceCents,
      diferencaCents: minimumPriceCents === null ? null : referencePriceCents - minimumPriceCents,
    };
  }

  /**
   * Conferência com o "Total dos Serviços" do DFP oficial: réplica exata da fórmula da
   * planilha-modelo (aba "REAL (2)", célula A214). O tributo sobre a receita é calculado
   * sobre a receita mensal INFORMADA × 12 (não sobre o preço mínimo acima), de propósito
   * — assim evita a circularidade que a própria planilha evita ao digitar esse valor em
   * vez de calculá-lo. Só aparece quando `informedMonthlyRevenueCents` é informado.
   */
  const informedMonthlyRevenueCents: number | null = doc.informedMonthlyRevenueCents ?? null;
  let totalServicosDfpCents: number | null = null;
  let resultadoContratoInformadoCents: number | null = null;
  let informedAnnualRevenueCents: number | null = null;
  if (informedMonthlyRevenueCents !== null && informedMonthlyRevenueCents > 0) {
    const kSemTributosReceita = indirectCostsPercent + profitPercent + costBasedTaxesPercent;
    informedAnnualRevenueCents = informedMonthlyRevenueCents * 12;
    if (kSemTributosReceita < 1) {
      const grossedUpCostCents = Math.round(costsBaseForPriceCents / (1 - kSemTributosReceita));
      const revenueTaxCents = Math.round(revenueBasedTaxesPercent * informedAnnualRevenueCents);
      totalServicosDfpCents = grossedUpCostCents + revenueTaxCents;
      resultadoContratoInformadoCents = informedAnnualRevenueCents - totalServicosDfpCents;
    }
  }

  return {
    maoDeObra: {
      direta: directLabor,
      indireta: indirectLabor,
      assistenciaMedicaCents: medicalAssistanceCents,
      despesaMoradiaCents: housingExpenseCents,
      uniformeEpiCents: uniformAndPpeCents,
      alimentacaoCents: foodAllowanceCents,
      outrosCustosCents: otherLaborCostsCents,
      totalCents: laborTotalCents,
    },
    materiais: { aplicacaoCents: materialsApplicationCents, outrosCents: otherMaterialsCents, totalCents: materialsTotalCents },
    equipamentos: equipment,
    veiculos: { depreciacao: vehicleDepreciation, manutencaoCents: vehicleMaintenanceCents, combustivelCents: vehicleFuelCents, totalCents: vehiclesTotalCents },
    totalCustosDiretosCents: directCostsCents,
    contingenciaValorCents: contingencyValueCents,
    custoFinanceiroValorCents: financialCostCents,
    totalCustosComContingenciaCents: costsBaseForPriceCents,
    custosIndiretosValorCents: indirectCostsValueCents,
    lucroValorCents: profitValueCents,
    tributosValorCents: taxesValueCents,
    precoMinimoCents: minimumPriceCents,
    precoEquilibrioCents: breakevenPriceCents,
    markupPercent,
    valorMensalCents: monthlyValueCents,
    valorAnualCents: annualValueCents,
    valorPorUnidadeCents: valuePerUnitCents,
    capitalGiroNecessarioCents: workingCapitalNeededCents,
    investimentoInicialCents: initialInvestmentCents,
    roiTotalPercent,
    roiAnualPercent: roiAnnualPercent,
    paybackMeses: paybackMonths,
    dre,
    comparacaoReferencia,
    totalServicosDfpCents,
    receitaAnualInformadaCents: informedAnnualRevenueCents,
    resultadoContratoInformadoCents,
  };
}

/* ----------------------------------- CRUD ----------------------------------- */

function serialize(doc: any) {
  return {
    id: String(doc._id),
    companyId: String(doc.companyId),
    name: doc.name,
    agency: doc.agency ?? '',
    object: doc.object ?? '',
    biddingNumber: doc.biddingNumber ?? '',
    taxRegime: doc.taxRegime ?? '',
    notes: doc.notes ?? '',
    directLabor: doc.directLabor,
    indirectLabor: doc.indirectLabor,
    medicalAssistance: doc.medicalAssistance ?? { items: [] },
    housingExpense: doc.housingExpense ?? { items: [] },
    uniformAndPpe: doc.uniformAndPpe ?? { items: [] },
    foodAllowance: doc.foodAllowance ?? { items: [] },
    otherLaborCosts: doc.otherLaborCosts ?? { medicalExpenses: { items: [] }, subcontracting: { items: [] } },
    materialsApplication: doc.materialsApplication ?? { items: [] },
    otherMaterials: doc.otherMaterials ?? { items: [] },
    equipment: doc.equipment,
    vehicles: doc.vehicles,
    contractMonths: doc.contractMonths ?? 12,
    unitCount: doc.unitCount ?? null,
    dailyFullTimeHours: doc.dailyFullTimeHours ?? 8,
    taxes: doc.taxes ?? { items: [] },
    contingencyPercent: doc.contingencyPercent ?? 0,
    workingCapital: doc.workingCapital ?? { receiptTermDays: 30, paymentTermDays: 30, monthlyFinancialRatePercent: 0, otherInitialInvestmentCents: 0 },
    indirectCostsPercent: doc.indirectCostsPercent,
    profitPercent: doc.profitPercent,
    costBasedTaxesPercent: doc.costBasedTaxesPercent ?? 0,
    revenueBasedTaxesPercent: doc.revenueBasedTaxesPercent,
    informedMonthlyRevenueCents: doc.informedMonthlyRevenueCents ?? null,
    referencePriceCents: doc.referencePriceCents ?? null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    resultado: computeResultado(doc),
  };
}

export async function listPriceFormationsService(q: ListPriceFormationsQuery) {
  const filter: Record<string, unknown> = {};
  const companyOid = await resolveCompanyObjectId(q.companyId);
  if (companyOid) filter.companyId = companyOid;
  if (q.search) {
    const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { agency: rx }, { object: rx }];
  }

  const { data, total } = await listPriceFormations({ filter, page: q.page, limit: q.limit });
  return { data: data.map(serialize), pagination: buildPagination(q.page, q.limit, total) };
}

export async function getPriceFormationService(id: string) {
  const doc = await findPriceFormationById(id);
  if (!doc) throw notFound('Formação de preço não encontrada');
  return serialize(doc);
}

async function normalizeBody(body: any) {
  const data: Record<string, unknown> = { ...body };
  if (body.companyId) data.companyId = await resolveCompanyObjectId(body.companyId);
  return data;
}

export async function createPriceFormationService(body: any) {
  const data = await normalizeBody(body);
  const doc = await createPriceFormation(data);
  return serialize(doc.toObject());
}

export async function updatePriceFormationService(id: string, body: any) {
  const data = await normalizeBody(body);
  const doc = await updatePriceFormation(id, data);
  if (!doc) throw notFound('Formação de preço não encontrada');
  return serialize(doc);
}

export async function deletePriceFormationService(id: string) {
  const doc = await deletePriceFormation(id);
  if (!doc) throw notFound('Formação de preço não encontrada');
  return { deleted: true };
}

export async function duplicatePriceFormationService(id: string, newName?: string) {
  const original = await findPriceFormationById(id);
  if (!original) throw notFound('Formação de preço não encontrada');
  const clone = { ...original } as Record<string, unknown>;
  delete clone._id;
  delete clone.createdAt;
  delete clone.updatedAt;
  clone.name = newName?.trim() || `${original.name} (cópia)`;
  const doc = await createPriceFormation(clone);
  return serialize(doc.toObject());
}
