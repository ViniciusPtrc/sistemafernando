import { PipelineStage, Types } from 'mongoose';
import { Contract } from '../models/contract.model';
import { Receivable } from '../models/receivable.model';
import { ContractCost } from '../models/contractCost.model';
import { resolveCompanyObjectId } from '../repositories/company.repo';
import { effectiveStatusExpr } from '../repositories/entry.repo';
import { resolvePeriod, monthKey, monthKeysFrom, monthKeysBetween, addMonths, type DateRange } from '../utils/period';
import { todayUTC, toYMD } from '../utils/dates';
import { notFound } from '../utils/http';
import type { MarginQuery } from '../validators/contract.schema';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function monthLabel(key: string): string {
  const [ano, mes] = key.split('-').map(Number);
  return `${MESES[(mes || 1) - 1]}/${String(ano).slice(2)}`;
}

/** Faixas de alerta de margem (§18) — fixas por agora, configurável fica para depois. */
export function classifyMargin(marginPct: number | null): { nivel: string; label: string } {
  if (marginPct === null) return { nivel: 'indefinida', label: 'N/A' };
  if (marginPct >= 30) return { nivel: 'excelente', label: 'Excelente' };
  if (marginPct >= 20) return { nivel: 'boa', label: 'Boa' };
  if (marginPct >= 10) return { nivel: 'atencao', label: 'Atenção' };
  if (marginPct >= 0) return { nivel: 'critica', label: 'Crítica' };
  return { nivel: 'prejuizo', label: 'Prejuízo' };
}

function computeMargin(receitaCents: number, custosCents: number) {
  const lucroCents = receitaCents - custosCents;
  const marginPct = receitaCents > 0 ? (lucroCents / receitaCents) * 100 : null;
  return { lucroCents, marginPct };
}

interface Scope {
  range: DateRange;
  contractIds: Types.ObjectId[];
}

/** Resolve os filtros (período + contrato/cliente/empresa/status) para o conjunto de contratos em jogo. */
async function resolveScope(q: MarginQuery): Promise<Scope> {
  const range = resolvePeriod(q.period, { from: q.from, to: q.to });

  const contractFilter: Record<string, unknown> = {};
  const companyOid = await resolveCompanyObjectId(q.companyId);
  if (companyOid) contractFilter.companyId = companyOid;
  if (q.status) contractFilter.status = q.status;
  if (q.customerName) contractFilter.customerName = q.customerName;
  if (q.contractId) contractFilter._id = new Types.ObjectId(q.contractId);
  if (q.search) {
    const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    contractFilter.$or = [{ number: rx }, { customerName: rx }];
  }

  const ids = await Contract.find(contractFilter).distinct('_id');
  return { range, contractIds: ids as Types.ObjectId[] };
}

/* ------------------------------- Receita (Receivable) ------------------------------- */

function revenueMatchStage(scope: Scope): PipelineStage[] {
  return [
    {
      $match: {
        contractId: { $in: scope.contractIds },
        dueDate: { $gte: scope.range.from, $lte: scope.range.to },
      },
    },
    { $addFields: { eff: effectiveStatusExpr(todayUTC()) } },
    { $match: { eff: { $ne: 'canceled' } } },
  ];
}

async function revenueTotals(scope: Scope) {
  const rows = await Receivable.aggregate([
    ...revenueMatchStage(scope),
    {
      $group: {
        _id: null,
        faturado: { $sum: '$amountCents' },
        recebido: { $sum: { $cond: [{ $eq: ['$eff', 'paid'] }, { $ifNull: ['$receivedAmountCents', '$amountCents'] }, 0] } },
      },
    },
  ]);
  const r = rows[0] ?? { faturado: 0, recebido: 0 };
  return { faturadoCents: r.faturado ?? 0, recebidoCents: r.recebido ?? 0, pendenteCents: (r.faturado ?? 0) - (r.recebido ?? 0) };
}

async function revenueByMonth(scope: Scope) {
  const rows = await Receivable.aggregate([
    ...revenueMatchStage(scope),
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$dueDate' } }, faturado: { $sum: '$amountCents' } } },
  ]);
  return new Map(rows.map((r: any) => [String(r._id), r.faturado as number]));
}

async function revenueByContract(scope: Scope) {
  const rows = await Receivable.aggregate([
    ...revenueMatchStage(scope),
    { $group: { _id: '$contractId', faturado: { $sum: '$amountCents' } } },
  ]);
  return new Map(rows.map((r: any) => [String(r._id), r.faturado as number]));
}

/* --------------------------------- Custos (ContractCost) --------------------------------- */

const costLookupStages: PipelineStage[] = [
  { $lookup: { from: 'payables', localField: 'payableId', foreignField: '_id', as: 'payable' } },
  { $unwind: { path: '$payable', preserveNullAndEmptyArrays: true } },
  {
    $addFields: {
      effAmountCents: { $cond: [{ $eq: ['$origin', 'payable'] }, '$payable.amountCents', '$amountCents'] },
      effDate: { $cond: [{ $eq: ['$origin', 'payable'] }, '$payable.dueDate', '$date'] },
    },
  },
];

function costMatchStage(scope: Scope): PipelineStage[] {
  return [{ $match: { contractId: { $in: scope.contractIds } } }, ...costLookupStages];
}

/**
 * Custos realizados dentro do período + custos projetados (sem filtro de data —
 * são sempre "o que ainda vem pela frente" independente da janela histórica
 * selecionada, igual ao §8/§13 do spec).
 */
async function costTotalsDirect(scope: Scope) {
  const [realizadoRows, projetadoRows] = await Promise.all([
    ContractCost.aggregate([
      ...costMatchStage(scope),
      { $match: { type: 'realizado', effDate: { $gte: scope.range.from, $lte: scope.range.to } } },
      { $group: { _id: null, total: { $sum: '$effAmountCents' } } },
    ]),
    ContractCost.aggregate([...costMatchStage(scope), { $match: { type: 'projetado' } }, { $group: { _id: null, total: { $sum: '$effAmountCents' } } }]),
  ]);
  return {
    realizadoCents: realizadoRows[0]?.total ?? 0,
    projetadoCents: projetadoRows[0]?.total ?? 0,
  };
}

async function costByMonth(scope: Scope) {
  const rows = await ContractCost.aggregate([
    ...costMatchStage(scope),
    { $match: { type: 'realizado', effDate: { $gte: scope.range.from, $lte: scope.range.to } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$effDate' } }, total: { $sum: '$effAmountCents' } } },
  ]);
  return new Map(rows.map((r: any) => [String(r._id), r.total as number]));
}

async function costByContract(scope: Scope, type: 'realizado' | 'projetado') {
  const match: Record<string, unknown> = { type };
  if (type === 'realizado') match.effDate = { $gte: scope.range.from, $lte: scope.range.to };
  const rows = await ContractCost.aggregate([...costMatchStage(scope), { $match: match }, { $group: { _id: '$contractId', total: { $sum: '$effAmountCents' } } }]);
  return new Map(rows.map((r: any) => [String(r._id), r.total as number]));
}

/* ---- Expansão de custos por mês (recorrência) — compartilhada por projeção e nível 2 ---- */

interface CostRow {
  origin: 'manual' | 'payable';
  recurrence: 'once' | 'installment' | 'fixed';
  installments: number | null;
  effAmountCents: number | null;
  effDate: Date | null;
  recurrenceEndDate: Date | null;
}

async function loadContractCostRows(contractId: Types.ObjectId): Promise<CostRow[]> {
  return ContractCost.aggregate([
    { $match: { contractId } },
    ...costLookupStages,
    {
      $project: {
        origin: 1,
        recurrence: { $ifNull: ['$recurrence', 'once'] },
        installments: 1,
        recurrenceEndDate: 1,
        effAmountCents: 1,
        effDate: 1,
      },
    },
  ]) as unknown as Promise<CostRow[]>;
}

/**
 * Distribui cada custo do contrato pelos meses de `keys` (lista de 'YYYY-MM'):
 *   - `once` / origem Contas a Pagar → mês da data/vencimento;
 *   - `installment` → `installments` meses a partir do mês inicial;
 *   - `fixed` → todo mês do inicial até o menor entre `recurrenceEndDate` e fim do contrato.
 */
function expandCostsByMonth(rows: CostRow[], keys: string[], contractEndKey: string | null): Map<string, number> {
  const keySet = new Set(keys);
  const out = new Map<string, number>(keys.map((k) => [k, 0]));
  const add = (k: string, cents: number) => {
    if (keySet.has(k)) out.set(k, (out.get(k) ?? 0) + cents);
  };

  for (const row of rows) {
    const cents = row.effAmountCents ?? 0;
    if (!cents || !row.effDate) continue;
    const anchor = new Date(row.effDate);

    if (row.origin === 'payable' || row.recurrence === 'once') {
      add(monthKey(anchor), cents);
      continue;
    }
    if (row.recurrence === 'installment') {
      const n = row.installments ?? 1;
      for (let i = 0; i < n; i++) add(monthKey(addMonths(anchor, i)), cents);
      continue;
    }
    // fixed
    const anchorKey = monthKey(anchor);
    const recEndKey = row.recurrenceEndDate ? monthKey(new Date(row.recurrenceEndDate)) : null;
    for (const k of keys) {
      if (k < anchorKey) continue;
      if (recEndKey && k > recEndKey) continue;
      if (contractEndKey && k > contractEndKey) continue;
      add(k, cents);
    }
  }
  return out;
}

/**
 * Série mês a mês de um contrato dentro de um período: receita vem das contas a
 * receber vinculadas se houver alguma; senão cai para o faturamento mensal fixo
 * do contrato (nos meses em que o contrato está ativo). Custos são os custos
 * lançados, distribuídos pela recorrência.
 */
async function contractDetailSeries(contract: any, range: DateRange) {
  const keys = monthKeysBetween(range.from, range.to);
  const startKey = contract.startDate ? monthKey(new Date(contract.startDate)) : keys[0] ?? '0000-00';
  const endKey = contract.endDate ? monthKey(new Date(contract.endDate)) : null;
  const monthly = contract.monthlyRevenueCents ?? 0;
  const scope: Scope = { range, contractIds: [contract._id as Types.ObjectId] };

  const [rev, revByMonth, costRows] = await Promise.all([
    revenueTotals(scope),
    (async () => {
      const rows = await Receivable.aggregate([
        ...revenueMatchStage(scope),
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$dueDate' } }, faturado: { $sum: '$amountCents' } } },
      ]);
      return new Map<string, number>(rows.map((r: any) => [String(r._id), r.faturado as number]));
    })(),
    loadContractCostRows(contract._id as Types.ObjectId),
  ]);

  const hasLinkedRevenue = rev.faturadoCents > 0;
  const costMap = expandCostsByMonth(costRows, keys, endKey);

  const linha = keys.map((chave) => {
    const ativo = chave >= startKey && (!endKey || chave <= endKey);
    const receitaCents = hasLinkedRevenue ? revByMonth.get(chave) ?? 0 : ativo ? monthly : 0;
    const custosCents = costMap.get(chave) ?? 0;
    const { lucroCents, marginPct } = computeMargin(receitaCents, custosCents);
    return { mes: monthLabel(chave), chave, receitaCents, custosCents, lucroCents, margemPct: marginPct };
  });

  const totReceitaCents = linha.reduce((s, m) => s + m.receitaCents, 0);
  const totCustoCents = linha.reduce((s, m) => s + m.custosCents, 0);
  return {
    linha,
    totReceitaCents,
    totCustoCents,
    hasLinkedRevenue,
    recebidoCents: hasLinkedRevenue ? rev.recebidoCents : 0,
    pendenteCents: hasLinkedRevenue ? rev.pendenteCents : 0,
  };
}

/* ------------------------------------ Nível 1 ------------------------------------ */

export async function getMarginSummary(q: MarginQuery) {
  const scope = await resolveScope(q);
  const [revenue, costs] = await Promise.all([revenueTotals(scope), costTotalsDirect(scope)]);
  const { lucroCents, marginPct } = computeMargin(revenue.faturadoCents, costs.realizadoCents);
  const projetado = computeMargin(revenue.faturadoCents, costs.realizadoCents + costs.projetadoCents);

  return {
    period: q.period,
    range: { from: toYMD(scope.range.from), to: toYMD(scope.range.to) },
    contratosNoEscopo: scope.contractIds.length,
    receitaCents: revenue.faturadoCents,
    custosCents: costs.realizadoCents,
    lucroCents,
    margemPct: marginPct,
    receitaRecebidaCents: revenue.recebidoCents,
    receitaPendenteCents: revenue.pendenteCents,
    custosProjetadosCents: costs.projetadoCents,
    lucroProjetadoCents: revenue.faturadoCents - costs.realizadoCents - costs.projetadoCents,
    margemProjetadaPct: projetado.marginPct,
    classificacao: classifyMargin(marginPct),
  };
}

export async function getMarginMonthly(q: MarginQuery) {
  const scope = await resolveScope(q);
  return marginMonthlyForScope(scope);
}

const SORT_FIELD: Record<string, string> = {
  receita: 'receitaCents',
  receita_asc: 'receitaCents',
  custos: 'custosCents',
  custos_asc: 'custosCents',
  lucro: 'lucroCents',
  lucro_asc: 'lucroCents',
  margem: 'margemPct',
  margem_asc: 'margemPct',
};

export async function getMarginByContract(q: MarginQuery, sort: string) {
  const scope = await resolveScope(q);
  if (!scope.contractIds.length) return [];

  const [contracts, revByContract, costByContractRealizado] = await Promise.all([
    Contract.find({ _id: { $in: scope.contractIds } }).lean().exec(),
    revenueByContract(scope),
    costByContract(scope, 'realizado'),
  ]);

  const rows = contracts.map((c: any) => {
    const receitaCents = revByContract.get(String(c._id)) ?? 0;
    const custosCents = costByContractRealizado.get(String(c._id)) ?? 0;
    const { lucroCents, marginPct } = computeMargin(receitaCents, custosCents);
    return {
      contractId: String(c._id),
      number: c.number,
      customerName: c.customerName,
      status: c.status,
      receitaCents,
      custosCents,
      lucroCents,
      margemPct: marginPct,
      classificacao: classifyMargin(marginPct),
    };
  });

  const field = SORT_FIELD[sort] ?? 'margemPct';
  const asc = sort.endsWith('_asc');
  rows.sort((a: any, b: any) => {
    const av = a[field] ?? -Infinity;
    const bv = b[field] ?? -Infinity;
    return asc ? av - bv : bv - av;
  });
  return rows;
}

/* ------------------------------------ Nível 2 ------------------------------------ */

export async function getContractMargin(contractId: string, q: MarginQuery) {
  const contract = await Contract.findById(contractId).lean().exec();
  if (!contract) throw notFound('Contrato não encontrado');

  const range = resolvePeriod(q.period, { from: q.from, to: q.to });
  const [series, projecao] = await Promise.all([
    contractDetailSeries(contract, range),
    getContractProjection(contractId, 36),
  ]);

  const atual = computeMargin(series.totReceitaCents, series.totCustoCents);

  return {
    contract: {
      id: String(contract._id),
      companyId: String(contract.companyId),
      number: contract.number,
      customerName: contract.customerName,
      customerDocument: contract.customerDocument ?? '',
      contractedValueCents: contract.contractedValueCents,
      monthlyRevenueCents: contract.monthlyRevenueCents ?? 0,
      status: contract.status,
      startDate: toYMD(contract.startDate),
      endDate: toYMD(contract.endDate),
      notes: contract.notes ?? '',
    },
    period: q.period,
    range: { from: toYMD(range.from), to: toYMD(range.to) },
    receitaCents: series.totReceitaCents,
    receitaRecebidaCents: series.recebidoCents,
    receitaPendenteCents: series.pendenteCents,
    receitaBase: series.hasLinkedRevenue ? 'vinculada' : 'faturamento_mensal',
    custosRealizadosCents: series.totCustoCents,
    custosProjetadosCents: projecao.totais.custosCents,
    lucroAtualCents: atual.lucroCents,
    lucroProjetadoCents: projecao.totais.lucroCents,
    margemAtualPct: atual.marginPct,
    margemProjetadaPct: projecao.totais.margemPct,
    classificacao: classifyMargin(atual.marginPct),
  };
}

export async function getContractMarginMonthly(contractId: string, q: MarginQuery) {
  const contract = await Contract.findById(contractId).lean().exec();
  if (!contract) throw notFound('Contrato não encontrado');
  const range = resolvePeriod(q.period, { from: q.from, to: q.to });
  const series = await contractDetailSeries(contract, range);
  return series.linha;
}

/* ------------------------------ Projeção (próximos N meses) ------------------------------ */

/**
 * Projeção mês a mês dos próximos `months` meses de um contrato (§Projeção).
 * Receita = faturamento mensal fixo do contrato (sem reajuste), zerada após a
 * data de término. Custo de cada mês = custos lançados distribuídos pela
 * recorrência (ver `expandCostsByMonth`). É isso que faz a margem "subir"
 * quando um parcelamento termina.
 */
export async function getContractProjection(contractId: string, months = 36) {
  const contract = await Contract.findById(contractId).lean().exec();
  if (!contract) throw notFound('Contrato não encontrado');

  const keys = monthKeysFrom(todayUTC(), months);
  const firstKey = keys[0];
  const lastKey = keys[keys.length - 1];

  const contractEndKey = contract.endDate ? monthKey(new Date(contract.endDate)) : null;
  const monthlyRevenueCents = contract.monthlyRevenueCents ?? 0;

  const costRows = await loadContractCostRows(contract._id as Types.ObjectId);
  const costByKey = expandCostsByMonth(costRows, keys, contractEndKey);

  let totalReceita = 0;
  let totalCusto = 0;
  const meses = keys.map((chave) => {
    const receitaCents = contractEndKey && chave > contractEndKey ? 0 : monthlyRevenueCents;
    const custosCents = costByKey.get(chave) ?? 0;
    const { lucroCents, marginPct } = computeMargin(receitaCents, custosCents);
    totalReceita += receitaCents;
    totalCusto += custosCents;
    return { mes: monthLabel(chave), chave, receitaCents, custosCents, lucroCents, margemPct: marginPct };
  });

  const totais = computeMargin(totalReceita, totalCusto);

  return {
    contract: {
      id: String(contract._id),
      number: contract.number,
      customerName: contract.customerName,
      status: contract.status,
      endDate: toYMD(contract.endDate),
    },
    months,
    monthlyRevenueCents,
    range: { from: firstKey, to: lastKey },
    meses,
    totais: {
      receitaCents: totalReceita,
      custosCents: totalCusto,
      lucroCents: totais.lucroCents,
      margemPct: totais.marginPct,
      margemMediaPct: totais.marginPct,
      classificacao: classifyMargin(totais.marginPct),
    },
  };
}

/** Núcleo de `getMarginMonthly` — reusado pelo Nível 2 com um `scope` já restrito a um contrato. */
async function marginMonthlyForScope(scope: Scope) {
  const [byMonthRevenue, byMonthCost] = await Promise.all([revenueByMonth(scope), costByMonth(scope)]);
  const keys = new Set([...byMonthRevenue.keys(), ...byMonthCost.keys()]);
  let cursor = new Date(Date.UTC(scope.range.from.getUTCFullYear(), scope.range.from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(scope.range.to.getUTCFullYear(), scope.range.to.getUTCMonth(), 1));
  while (cursor <= end) {
    keys.add(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`);
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  return [...keys].sort().map((key) => {
    const receitaCents = byMonthRevenue.get(key) ?? 0;
    const custosCents = byMonthCost.get(key) ?? 0;
    const { lucroCents, marginPct } = computeMargin(receitaCents, custosCents);
    return { mes: monthLabel(key), chave: key, receitaCents, custosCents, lucroCents, margemPct: marginPct };
  });
}
