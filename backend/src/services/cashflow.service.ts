import { Receivable } from '../models/receivable.model';
import { Payable } from '../models/payable.model';
import { companyMetaMap, resolveCompanyObjectId } from '../repositories/company.repo';
import { effectiveStatusExpr } from '../repositories/entry.repo';
import { todayUTC, toYMD, ymdToDate } from '../utils/dates';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function labelFor(key: string, groupBy: string): string {
  if (groupBy === 'month') {
    const [ano, mes] = key.split('-').map(Number);
    return `${MESES_ABREV[(mes || 1) - 1]}/${String(ano).slice(2)}`;
  }
  return key; // day / week: usa a própria data ISO
}

function fmtKey(groupBy: string) {
  if (groupBy === 'day') return { format: '%Y-%m-%d', date: '$ref' } as const;
  if (groupBy === 'week') return { format: '%Y-%m-%d', date: { $dateTrunc: { date: '$ref', unit: 'week' } } } as const;
  return { format: '%Y-%m', date: '$ref' } as const;
}

interface CashFlowParams {
  companyId?: string;
  groupBy?: 'day' | 'week' | 'month';
  startDate?: string;
  endDate?: string;
}

async function baseMatch(companyId?: string, startDate?: string, endDate?: string) {
  const match: Record<string, unknown> = {};
  const oid = await resolveCompanyObjectId(companyId);
  if (oid) match.companyId = oid;
  const gte = ymdToDate(startDate);
  const lte = ymdToDate(endDate);
  if (gte || lte) match.dueDate = { ...(gte ? { $gte: gte } : {}), ...(lte ? { $lte: lte } : {}) };
  return match;
}

/** Pontos do fluxo: usa TODOS os não-cancelados, ref = pagamento ?? vencimento (igual ao mock). */
export async function cashFlowPointsService(params: CashFlowParams) {
  const groupBy = params.groupBy ?? 'month';
  const match = await baseMatch(params.companyId, params.startDate, params.endDate);
  const now = todayUTC();

  const side = (model: typeof Receivable | typeof Payable, field: 'inflow' | 'outflow') =>
    model.aggregate([
      { $match: match },
      { $addFields: { eff: effectiveStatusExpr(now), ref: { $ifNull: ['$paymentDate', '$dueDate'] } } },
      { $match: { eff: { $ne: 'canceled' } } },
      { $group: { _id: { $dateToString: fmtKey(groupBy) }, total: { $sum: '$amountCents' } } },
    ]).then((rows) => rows.map((r) => ({ key: String(r._id), field, total: r.total as number })));

  const [inflow, outflow] = await Promise.all([side(Receivable, 'inflow'), side(Payable, 'outflow')]);

  const map = new Map<string, { date: string; label: string; inflowCents: number; outflowCents: number; balanceCents: number }>();
  for (const row of [...inflow, ...outflow]) {
    const cur =
      map.get(row.key) ??
      { date: row.key, label: labelFor(row.key, groupBy), inflowCents: 0, outflowCents: 0, balanceCents: 0 };
    if (row.field === 'inflow') cur.inflowCents += row.total;
    else cur.outflowCents += row.total;
    cur.balanceCents = cur.inflowCents - cur.outflowCents;
    map.set(row.key, cur);
  }
  return [...map.keys()].sort().map((k) => map.get(k)!);
}

/** Resumo: só o que foi efetivamente pago/recebido (status paid + data). */
export async function cashFlowSummaryService(companyId?: string) {
  const match = await baseMatch(companyId);
  const now = todayUTC();

  const paidSum = (model: typeof Receivable | typeof Payable) =>
    model.aggregate([
      { $match: match },
      { $addFields: { eff: effectiveStatusExpr(now) } },
      { $match: { eff: 'paid', paymentDate: { $ne: null } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$receivedAmountCents', '$amountCents'] } } } },
    ]).then((r) => r[0]?.total ?? 0);

  const [totalInflowCents, totalOutflowCents] = await Promise.all([paidSum(Receivable), paidSum(Payable)]);

  const meta = await companyMetaMap();
  let openingBalanceCents = 0;
  if (!companyId || companyId === 'all') {
    for (const m of meta.values()) openingBalanceCents += m.openingBalanceCents;
  } else {
    openingBalanceCents = [...meta.values()].find((m) => m.slug === companyId)?.openingBalanceCents ?? 0;
  }

  return {
    openingBalanceCents,
    totalInflowCents,
    totalOutflowCents,
    closingBalanceCents: openingBalanceCents + totalInflowCents - totalOutflowCents,
  };
}

/** Lançamentos detalhados com saldo acumulado (mais recentes primeiro). */
export async function cashFlowEntriesService(companyId?: string) {
  const match = await baseMatch(companyId);
  const now = todayUTC();
  const meta = await companyMetaMap();
  const slugOf = (id: unknown) => meta.get(String(id))?.slug ?? String(id);

  const rec = await Receivable.aggregate([
    { $match: match },
    { $addFields: { eff: effectiveStatusExpr(now) } },
    { $match: { eff: 'paid', paymentDate: { $ne: null } } },
  ]);
  const pag = await Payable.aggregate([
    { $match: match },
    { $addFields: { eff: effectiveStatusExpr(now) } },
    { $match: { eff: 'paid', paymentDate: { $ne: null } } },
  ]);

  type Lanc = {
    id: string;
    companyId: string;
    data: string;
    descricao: string;
    tipo: 'entrada' | 'saida';
    categoriaNome: string;
    entradaCents: number;
    saidaCents: number;
    saldoCents: number;
    formaPagamento: string;
  };

  const lancamentos: Omit<Lanc, 'saldoCents'>[] = [];
  for (const c of rec) {
    lancamentos.push({
      id: `fc-cr-${c._id}`,
      companyId: slugOf(c.companyId),
      data: toYMD(c.paymentDate)!,
      descricao: `${c.description || 'Recebimento'} — ${c.customerName}`,
      tipo: 'entrada',
      categoriaNome: c.categoryName || '',
      entradaCents: c.receivedAmountCents ?? c.amountCents,
      saidaCents: 0,
      formaPagamento: c.paymentMethod || 'boleto',
    });
  }
  for (const c of pag) {
    lancamentos.push({
      id: `fc-cp-${c._id}`,
      companyId: slugOf(c.companyId),
      data: toYMD(c.paymentDate)!,
      descricao: `${c.description || 'Pagamento'} — ${c.supplierName}`,
      tipo: 'saida',
      categoriaNome: c.categoryName || '',
      entradaCents: 0,
      saidaCents: c.amountCents,
      formaPagamento: c.paymentMethod || 'boleto',
    });
  }

  lancamentos.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));

  const summary = await cashFlowSummaryService(companyId);
  let saldo = summary.openingBalanceCents;
  const comSaldo: Lanc[] = lancamentos.map((l) => {
    saldo += l.entradaCents - l.saidaCents;
    return { ...l, saldoCents: saldo };
  });

  return comSaldo.reverse();
}

/** Comparativo entre empresas: saldo por período de cada empresa. */
export async function cashFlowComparisonService() {
  const meta = await companyMetaMap();
  const slugs = [...meta.values()].map((m) => m.slug);

  const perCompany = await Promise.all(
    slugs.map(async (slug) => ({ slug, pontos: await cashFlowPointsService({ companyId: slug, groupBy: 'month' }) })),
  );
  const consolidado = await cashFlowPointsService({ groupBy: 'month' });

  const byLabel = new Map<string, Record<string, number | string>>();
  for (const { slug, pontos } of perCompany) {
    for (const p of pontos) {
      const row = byLabel.get(p.label) ?? { label: p.label };
      row[slug] = p.balanceCents;
      byLabel.set(p.label, row);
    }
  }

  return consolidado.map((p) => {
    const row = byLabel.get(p.label) ?? { label: p.label };
    for (const slug of slugs) if (row[slug] === undefined) row[slug] = 0;
    return row;
  });
}
