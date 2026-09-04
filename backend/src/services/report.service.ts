import { Receivable } from '../models/receivable.model';
import { Payable } from '../models/payable.model';
import { Category } from '../models/category.model';
import { resolveCompanyObjectId } from '../repositories/company.repo';
import { effectiveStatusExpr } from '../repositories/entry.repo';
import { todayUTC, toYMD } from '../utils/dates';
import { formatBRL } from '../utils/money';
import { getCompanyComparisonService } from './dashboard.service';
import { cashFlowEntriesService, cashFlowSummaryService } from './cashflow.service';
import { HttpError } from '../utils/http';

export interface TabelaRelatorio {
  colunas: string[];
  linhas: (string | number)[][];
}

const REPORT_TYPES = [
  'contas_pagar',
  'contas_receber',
  'inadimplencia',
  'fluxo_caixa',
  'por_cliente',
  'por_fornecedor',
  'por_categoria',
  'resultado_financeiro',
  'contas_pagar_por_empresa',
  'contas_receber_por_empresa',
  'fluxo_caixa_por_empresa',
  'inadimplencia_por_empresa',
  'resultado_financeiro_por_empresa',
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export function isReportType(v: string): v is ReportType {
  return (REPORT_TYPES as readonly string[]).includes(v);
}

function ptBRDate(ymd: string | null): string {
  if (!ymd) return '—';
  const [a, m, d] = ymd.split('-');
  return `${d}/${m}/${a}`;
}

function statusLabel(kind: 'receivable' | 'payable', eff: string): string {
  if (eff === 'paid') return kind === 'receivable' ? 'Recebido' : 'Pago';
  if (eff === 'overdue') return 'Vencido';
  if (eff === 'canceled') return 'Cancelado';
  return kind === 'receivable' ? 'A vencer' : 'Em aberto';
}

async function matchFor(companyId?: string) {
  const oid = await resolveCompanyObjectId(companyId);
  return oid ? { companyId: oid } : {};
}

export async function generateReport(type: ReportType, companyId?: string): Promise<TabelaRelatorio> {
  const now = todayUTC();
  const match = await matchFor(companyId);

  switch (type) {
    case 'contas_pagar':
    case 'contas_receber': {
      const kind = type === 'contas_pagar' ? 'payable' : 'receivable';
      const model = kind === 'payable' ? Payable : Receivable;
      const nameField = kind === 'payable' ? 'supplierName' : 'customerName';
      const rows = await model.aggregate([
        { $match: match },
        { $addFields: { eff: effectiveStatusExpr(now) } },
        { $sort: { dueDate: -1 } },
        { $limit: 25 },
      ]);
      return {
        colunas: [kind === 'payable' ? 'Fornecedor' : 'Cliente', 'Documento', 'Vencimento', 'Categoria', 'Valor', 'Status'],
        linhas: rows.map((c) => [
          c[nameField],
          c.documentNumber,
          ptBRDate(toYMD(c.dueDate)),
          c.categoryName || '',
          formatBRL(c.amountCents),
          statusLabel(kind, c.eff),
        ]),
      };
    }

    case 'inadimplencia': {
      const overdue = (model: typeof Receivable | typeof Payable, nameField: string) =>
        model.aggregate([
          { $match: match },
          { $addFields: { eff: effectiveStatusExpr(now) } },
          { $match: { eff: 'overdue' } },
          { $sort: { dueDate: 1 } },
        ]).then((rows) => rows.map((c) => ({ name: c[nameField], doc: c.documentNumber, due: toYMD(c.dueDate), amt: c.amountCents })));
      const [rec, pag] = await Promise.all([overdue(Receivable, 'customerName'), overdue(Payable, 'supplierName')]);
      return {
        colunas: ['Tipo', 'Cliente/Fornecedor', 'Documento', 'Vencimento', 'Valor'],
        linhas: [
          ...rec.map((r) => ['A Receber', r.name, r.doc, ptBRDate(r.due), formatBRL(r.amt)]),
          ...pag.map((r) => ['A Pagar', r.name, r.doc, ptBRDate(r.due), formatBRL(r.amt)]),
        ].slice(0, 25),
      };
    }

    case 'fluxo_caixa': {
      const entries = (await cashFlowEntriesService(companyId)).slice(0, 25);
      return {
        colunas: ['Data', 'Descrição', 'Tipo', 'Entrada', 'Saída', 'Saldo'],
        linhas: entries.map((l) => [
          ptBRDate(l.data),
          l.descricao,
          l.tipo === 'entrada' ? 'Entrada' : 'Saída',
          l.entradaCents > 0 ? formatBRL(l.entradaCents) : '—',
          l.saidaCents > 0 ? formatBRL(l.saidaCents) : '—',
          formatBRL(l.saldoCents),
        ]),
      };
    }

    case 'por_cliente':
    case 'por_fornecedor': {
      const isCli = type === 'por_cliente';
      const model = isCli ? Receivable : Payable;
      const nameField = isCli ? '$customerName' : '$supplierName';
      const rows = await model.aggregate([
        { $match: match },
        { $addFields: { eff: effectiveStatusExpr(now) } },
        { $match: { eff: { $ne: 'canceled' } } },
        { $group: { _id: nameField, valor: { $sum: '$amountCents' }, qtd: { $sum: 1 } } },
        { $sort: { valor: -1 } },
      ]);
      return {
        colunas: [isCli ? 'Cliente' : 'Fornecedor', 'Quantidade de Títulos', 'Valor Total'],
        linhas: rows.map((r) => [String(r._id ?? ''), r.qtd, formatBRL(r.valor)]),
      };
    }

    case 'por_categoria': {
      const cats = await Category.find().lean().exec();
      const sums = async (model: typeof Receivable | typeof Payable) =>
        model.aggregate([
          { $match: match },
          { $addFields: { eff: effectiveStatusExpr(now) } },
          { $match: { eff: { $ne: 'canceled' } } },
          { $group: { _id: '$category', valor: { $sum: '$amountCents' } } },
        ]).then((rows) => new Map(rows.map((r) => [String(r._id), r.valor as number])));
      const [recMap, pagMap] = await Promise.all([sums(Receivable), sums(Payable)]);
      const receitas = cats
        .filter((c) => c.tipo === 'receita')
        .map((c) => ['Receita', c.nome, formatBRL(recMap.get(String(c._id)) ?? 0)]);
      const despesas = cats
        .filter((c) => c.tipo === 'despesa')
        .map((c) => ['Despesa', c.nome, formatBRL(pagMap.get(String(c._id)) ?? 0)]);
      return { colunas: ['Tipo', 'Categoria', 'Valor Total'], linhas: [...receitas, ...despesas] };
    }

    case 'resultado_financeiro': {
      const paid = (model: typeof Receivable | typeof Payable) =>
        model.aggregate([
          { $match: match },
          { $addFields: { eff: effectiveStatusExpr(now) } },
          { $match: { eff: 'paid' } },
          { $group: { _id: null, total: { $sum: { $ifNull: ['$receivedAmountCents', '$amountCents'] } } } },
        ]).then((r) => r[0]?.total ?? 0);
      const [recebido, pago] = await Promise.all([paid(Receivable), paid(Payable)]);
      return {
        colunas: ['Indicador', 'Valor'],
        linhas: [
          ['Total Recebido', formatBRL(recebido)],
          ['Total Pago', formatBRL(pago)],
          ['Resultado Líquido', formatBRL(recebido - pago)],
        ],
      };
    }

    case 'contas_pagar_por_empresa':
    case 'contas_receber_por_empresa': {
      const isPag = type === 'contas_pagar_por_empresa';
      const { empresas } = await getCompanyComparisonService();
      return {
        colunas: ['Empresa', 'Quantidade', isPag ? 'Pago' : 'Recebido', 'Em Aberto', 'Vencido', 'Total'],
        linhas: empresas.map((e) => [
          e.companyName,
          isPag ? e.quantidadePagar : e.quantidadeReceber,
          formatBRL(isPag ? e.pagoCents : e.recebidoCents),
          formatBRL(isPag ? e.aPagarCents : e.aReceberCents),
          formatBRL(isPag ? e.vencidoPagarCents : e.vencidoReceberCents),
          formatBRL((isPag ? e.pagoCents + e.aPagarCents : e.recebidoCents + e.aReceberCents)),
        ]),
      };
    }

    case 'fluxo_caixa_por_empresa': {
      const { empresas } = await getCompanyComparisonService();
      const linhas = await Promise.all(
        empresas.map(async (e) => {
          const s = await cashFlowSummaryService(e.companyId);
          return [e.companyName, formatBRL(s.totalInflowCents), formatBRL(s.totalOutflowCents), formatBRL(s.totalInflowCents - s.totalOutflowCents)];
        }),
      );
      return { colunas: ['Empresa', 'Entradas', 'Saídas', 'Saldo'], linhas };
    }

    case 'inadimplencia_por_empresa': {
      const { empresas } = await getCompanyComparisonService();
      return {
        colunas: ['Empresa', 'Vencido a Receber', 'Vencido a Pagar', 'Total Vencido', 'Taxa de Inadimplência'],
        linhas: empresas.map((e) => [
          e.companyName,
          formatBRL(e.vencidoReceberCents),
          formatBRL(e.vencidoPagarCents),
          formatBRL(e.vencidoReceberCents + e.vencidoPagarCents),
          `${e.taxaInadimplencia.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
        ]),
      };
    }

    case 'resultado_financeiro_por_empresa': {
      const { empresas } = await getCompanyComparisonService();
      return {
        colunas: ['Empresa', 'Recebido', 'Pago', 'Resultado Líquido'],
        linhas: empresas.map((e) => [
          e.companyName,
          formatBRL(e.recebidoCents),
          formatBRL(e.pagoCents),
          formatBRL(e.recebidoCents - e.pagoCents),
        ]),
      };
    }

    default:
      throw new HttpError(400, `Tipo de relatório desconhecido: ${type}`);
  }
}
