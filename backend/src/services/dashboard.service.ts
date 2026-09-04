import { PipelineStage, Types } from 'mongoose';
import { Receivable } from '../models/receivable.model';
import { Payable } from '../models/payable.model';
import { Category } from '../models/category.model';
import { companyMetaMap, resolveCompanyObjectId } from '../repositories/company.repo';
import { effectiveStatusExpr } from '../repositories/entry.repo';
import { todayUTC, addDays } from '../utils/dates';
import { formatBRL } from '../utils/money';

const OPEN = ['pending', 'overdue'];
const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function monthLabel(key: string): string {
  const [ano, mes] = key.split('-').map(Number);
  return `${MESES_ABREV[(mes || 1) - 1]}/${String(ano).slice(2)}`;
}

interface Scope {
  match: Record<string, unknown>;
  now: Date;
}

async function scopeFor(companyId?: string): Promise<Scope> {
  const oid = await resolveCompanyObjectId(companyId);
  return { match: oid ? { companyId: oid } : {}, now: todayUTC() };
}

const withEff = (now: Date): PipelineStage[] => [{ $addFields: { eff: effectiveStatusExpr(now) } }];

/** Totais principais de uma coleção (receivable ou payable). */
async function collectionTotals(model: typeof Receivable | typeof Payable, scope: Scope) {
  const rows = await model.aggregate([
    { $match: scope.match },
    ...withEff(scope.now),
    {
      $group: {
        _id: null,
        countNaoCancelado: { $sum: { $cond: [{ $ne: ['$eff', 'canceled'] }, 1, 0] } },
        aberto: { $sum: { $cond: [{ $in: ['$eff', OPEN] }, '$amountCents', 0] } },
        abertoCount: { $sum: { $cond: [{ $in: ['$eff', OPEN] }, 1, 0] } },
        vencido: { $sum: { $cond: [{ $eq: ['$eff', 'overdue'] }, '$amountCents', 0] } },
        vencidoCount: { $sum: { $cond: [{ $eq: ['$eff', 'overdue'] }, 1, 0] } },
        pago: {
          $sum: {
            $cond: [{ $eq: ['$eff', 'paid'] }, { $ifNull: ['$receivedAmountCents', '$amountCents'] }, 0],
          },
        },
        somaNaoCancelado: { $sum: { $cond: [{ $ne: ['$eff', 'canceled'] }, '$amountCents', 0] } },
      },
    },
  ]);
  const r = rows[0] ?? {};
  return {
    countNaoCancelado: r.countNaoCancelado ?? 0,
    abertoCents: r.aberto ?? 0,
    abertoCount: r.abertoCount ?? 0,
    vencidoCents: r.vencido ?? 0,
    vencidoCount: r.vencidoCount ?? 0,
    pagoCents: r.pago ?? 0,
    somaNaoCanceladoCents: r.somaNaoCancelado ?? 0,
  };
}

async function ranking(model: typeof Receivable | typeof Payable, scope: Scope, nameField: string) {
  const rows = await model.aggregate([
    { $match: scope.match },
    ...withEff(scope.now),
    { $match: { eff: { $in: OPEN } } },
    { $group: { _id: `$${nameField}`, valorCents: { $sum: '$amountCents' }, quantidade: { $sum: 1 } } },
    { $sort: { valorCents: -1 } },
    { $limit: 5 },
  ]);
  return rows.map((r) => ({ id: String(r._id), nome: String(r._id ?? '—'), valorCents: r.valorCents, quantidade: r.quantidade }));
}

async function despesasPorCategoria(scope: Scope) {
  const rows = await Payable.aggregate([
    { $match: scope.match },
    ...withEff(scope.now),
    { $match: { eff: { $ne: 'canceled' } } },
    { $group: { _id: '$category', categoriaNome: { $first: '$categoryName' }, valorCents: { $sum: '$amountCents' } } },
    { $match: { valorCents: { $gt: 0 } } },
    { $sort: { valorCents: -1 } },
  ]);
  const cats = await Category.find().lean().exec();
  const corById = new Map(cats.map((c) => [String(c._id), c.cor]));
  return rows.map((r) => ({
    categoriaId: String(r._id),
    categoriaNome: r.categoriaNome ?? String(r._id),
    valorCents: r.valorCents,
    cor: corById.get(String(r._id)) ?? '#64748b',
  }));
}

async function fluxoCaixaMensal(scope: Scope) {
  const build = (model: typeof Receivable | typeof Payable, campo: 'receitas' | 'despesas') =>
    model.aggregate([
      { $match: scope.match },
      ...withEff(scope.now),
      { $match: { eff: { $ne: 'canceled' } } },
      { $addFields: { ref: { $ifNull: ['$paymentDate', '$dueDate'] } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$ref' } },
          total: { $sum: '$amountCents' },
        },
      },
    ]).then((rows) => rows.map((r) => ({ key: String(r._id), campo, total: r.total })));

  const [rec, pag] = await Promise.all([build(Receivable, 'receitas'), build(Payable, 'despesas')]);
  const map = new Map<string, { label: string; receitasCents: number; despesasCents: number; saldoCents: number }>();
  for (const row of [...rec, ...pag]) {
    const cur = map.get(row.key) ?? { label: monthLabel(row.key), receitasCents: 0, despesasCents: 0, saldoCents: 0 };
    if (row.campo === 'receitas') cur.receitasCents += row.total;
    else cur.despesasCents += row.total;
    cur.saldoCents = cur.receitasCents - cur.despesasCents;
    map.set(row.key, cur);
  }
  return [...map.keys()].sort().map((k) => map.get(k)!);
}

async function proximos7(model: typeof Receivable | typeof Payable, scope: Scope) {
  const from = scope.now;
  const to = addDays(scope.now, 7);
  const rows = await model.aggregate([
    { $match: { ...scope.match, dueDate: { $gte: from, $lte: to } } },
    ...withEff(scope.now),
    { $match: { eff: { $in: OPEN } } },
    { $group: { _id: null, valorCents: { $sum: '$amountCents' }, quantidade: { $sum: 1 } } },
  ]);
  return { valorCents: rows[0]?.valorCents ?? 0, quantidade: rows[0]?.quantidade ?? 0 };
}

export async function getDashboardService(companyId?: string) {
  const scope = await scopeFor(companyId);

  const [rec, pag, topClientes, topFornecedores, categoriasDespesa, fluxoCaixa, recProx, pagProx] = await Promise.all([
    collectionTotals(Receivable, scope),
    collectionTotals(Payable, scope),
    ranking(Receivable, scope, 'customerName'),
    ranking(Payable, scope, 'supplierName'),
    despesasPorCategoria(scope),
    fluxoCaixaMensal(scope),
    proximos7(Receivable, scope),
    proximos7(Payable, scope),
  ]);

  const totalTitulos = rec.countNaoCancelado + pag.countNaoCancelado;
  const totalVencidos = rec.vencidoCount + pag.vencidoCount;
  const taxaInadimplencia = totalTitulos > 0 ? (totalVencidos / totalTitulos) * 100 : 0;
  const ticketMedioCents = rec.countNaoCancelado > 0 ? Math.round(rec.somaNaoCanceladoCents / rec.countNaoCancelado) : 0;
  const projectedBalanceCents = rec.abertoCents - pag.abertoCents;
  const valorVencidoTotalCents = rec.vencidoCents + pag.vencidoCents;

  const alertas: { id: string; nivel: 'critico' | 'atencao' | 'sucesso'; mensagem: string; detalhe?: string }[] = [];
  if (valorVencidoTotalCents > 0) {
    alertas.push({
      id: 'alerta-vencidas',
      nivel: 'critico',
      mensagem: `${formatBRL(valorVencidoTotalCents)} em contas vencidas`,
      detalhe: `${totalVencidos} títulos vencidos precisam de atenção imediata.`,
    });
  }
  if (pagProx.quantidade > 0) {
    alertas.push({
      id: 'alerta-vencendo',
      nivel: 'atencao',
      mensagem: `${pagProx.quantidade} contas a pagar vencem nos próximos 7 dias`,
      detalhe: `Total de ${formatBRL(pagProx.valorCents)} previstos para saída.`,
    });
  }
  if (recProx.quantidade > 0) {
    alertas.push({
      id: 'alerta-recebimentos',
      nivel: 'sucesso',
      mensagem: `Recebimentos previstos de ${formatBRL(recProx.valorCents)} esta semana`,
      detalhe: `${recProx.quantidade} títulos com vencimento nos próximos 7 dias.`,
    });
  }

  const empty = { id: '', nome: '—', valorCents: 0, quantidade: 0 };

  const scopeSlug = companyId && companyId !== 'all' ? companyId : 'all';

  return {
    scope: scopeSlug,
    receivable: { valorCents: rec.abertoCents, quantidade: rec.abertoCount, variacaoPercentual: 0 },
    payable: { valorCents: pag.abertoCents, quantidade: pag.abertoCount, variacaoPercentual: 0 },
    projectedBalanceCents,
    overdueReceivable: { valorCents: rec.vencidoCents, quantidade: rec.vencidoCount },
    overduePayable: { valorCents: pag.vencidoCents, quantidade: pag.vencidoCount },
    delinquency: {
      valorVencidoCents: valorVencidoTotalCents,
      quantidadeVencidos: totalVencidos,
      percentual: taxaInadimplencia,
    },
    totalReceivedCents: rec.pagoCents,
    totalPaidCents: pag.pagoCents,
    ticketMedioCents,
    maiorCliente: topClientes[0] ?? empty,
    maiorFornecedor: topFornecedores[0] ?? empty,
    taxaInadimplencia,
    fluxoCaixa,
    topClientes,
    topFornecedores,
    categoriasDespesa,
    alertas,
    // bloco "espelho" com nomes do §16 (mesmos números, cents)
    resumo: {
      totalReceivableCents: rec.abertoCents,
      totalPayableCents: pag.abertoCents,
      totalReceivedCents: rec.pagoCents,
      totalPaidCents: pag.pagoCents,
      projectedBalanceCents,
      overdueReceivableCents: rec.vencidoCents,
      overduePayableCents: pag.vencidoCents,
      receivableCount: rec.abertoCount,
      payableCount: pag.abertoCount,
      delinquencyRate: taxaInadimplencia,
    },
  };
}

/* ------------------------- /dashboard/companies (§18) ------------------------- */

async function metricsForCompany(companyId: string | null, meta: Awaited<ReturnType<typeof companyMetaMap>>) {
  const scope: Scope = {
    match: companyId ? { companyId: new Types.ObjectId(companyId) } : {},
    now: todayUTC(),
  };
  const [rec, pag] = await Promise.all([collectionTotals(Receivable, scope), collectionTotals(Payable, scope)]);

  const totalTitulos = rec.countNaoCancelado + pag.countNaoCancelado;
  const totalVencidos = rec.vencidoCount + pag.vencidoCount;
  const info = companyId ? meta.get(String(companyId)) : undefined;

  return {
    companyId: info?.slug ?? 'all',
    companyName: info?.name ?? 'Consolidado',
    shortName: info?.shortName ?? 'Consolidado',
    color: info?.color ?? '#0f172a',
    aReceberCents: rec.abertoCents,
    aPagarCents: pag.abertoCents,
    recebidoCents: rec.pagoCents,
    pagoCents: pag.pagoCents,
    saldoProjetadoCents: rec.abertoCents - pag.abertoCents,
    vencidoReceberCents: rec.vencidoCents,
    vencidoPagarCents: pag.vencidoCents,
    quantidadeReceber: rec.abertoCount,
    quantidadePagar: pag.abertoCount,
    taxaInadimplencia: totalTitulos > 0 ? (totalVencidos / totalTitulos) * 100 : 0,
  };
}

const RANKING_SORT: Record<string, keyof Awaited<ReturnType<typeof metricsForCompany>>> = {
  saldo: 'saldoProjetadoCents',
  recebido: 'recebidoCents',
  aReceber: 'aReceberCents',
  aPagar: 'aPagarCents',
  inadimplencia: 'taxaInadimplencia',
};

export async function getCompanyComparisonService(sort?: string) {
  const meta = await companyMetaMap();
  const ids = [...meta.keys()];
  const empresas = await Promise.all(ids.map((id) => metricsForCompany(id, meta)));
  const consolidado = await metricsForCompany(null, meta);

  if (sort && RANKING_SORT[sort]) {
    const key = RANKING_SORT[sort];
    empresas.sort((a, b) => (b[key] as number) - (a[key] as number));
  } else {
    empresas.sort((a, b) => a.companyName.localeCompare(b.companyName, 'pt-BR'));
  }

  return { empresas, consolidado };
}
