/**
 * Conversão entre os DTOs do backend (inglês, valores em centavos, datas YYYY-MM-DD)
 * e os tipos que o front-end já usa (português, valores em reais). Concentrar tudo
 * aqui mantém componentes e páginas intactos.
 */
import type {
  ContaPagar,
  ContaReceber,
  DashboardFinanceiro,
  LancamentoFluxoCaixa,
  PontoFluxoCaixa,
  RespostaPaginada,
  StatusConta,
} from '@/types';
import type { CompanyMetrics } from '@/types';

export const centsToReais = (c: number | null | undefined): number => (c == null ? 0 : c / 100);

/**
 * O front usa o próprio nome do cliente/fornecedor como identificador nos
 * selects de filtro (o backend deriva a lista por `distinct` e filtra por nome).
 */
export const partyId = (nome: string): string => nome;

/* -------------------------------- STATUS -------------------------------- */

export function statusReceberFromApi(eff: string): StatusConta {
  switch (eff) {
    case 'paid':
      return 'recebido';
    case 'overdue':
      return 'vencido';
    case 'canceled':
      return 'cancelado';
    default:
      return 'a_vencer';
  }
}

export function statusPagarFromApi(eff: string): StatusConta {
  switch (eff) {
    case 'paid':
      return 'pago';
    case 'overdue':
      return 'vencido';
    case 'canceled':
      return 'cancelado';
    default:
      return 'em_aberto';
  }
}

/** Status do front -> valor aceito pela query da API. */
export function statusToApi(status: StatusConta | undefined, kind: 'receivable' | 'payable'): string | undefined {
  if (!status) return undefined;
  switch (status) {
    case 'recebido':
    case 'pago':
      return 'paid';
    case 'vencido':
      return 'overdue';
    case 'cancelado':
      return 'canceled';
    case 'a_vencer':
      return 'pending';
    case 'em_aberto':
      return kind === 'receivable' ? 'em_aberto' : 'pending';
    default:
      return undefined;
  }
}

function origemFromSource(source: string): ContaReceber['origem'] {
  if (source === 'seed_real') return 'dataset_inicial';
  if (source === 'import') return 'importacao_excel';
  return 'sintetico';
}

function fonteImportacaoFromDto(importSource: string | undefined): ContaReceber['fonteImportacao'] {
  return importSource === 'totvs' ? 'totvs' : importSource === 'legacy' ? 'legacy' : undefined;
}

/* ---------------------------- ENTIDADES ---------------------------- */

export interface ReceivableDTO {
  id: string;
  companyId: string;
  customerName: string;
  customerDocument: string;
  documentNumber: string;
  description: string;
  category: string;
  categoryName: string;
  amountCents: number;
  grossAmountCents: number;
  receivedAmountCents: number | null;
  dueDate: string | null;
  paymentDate: string | null;
  status: string;
  paymentMethod: ContaReceber['formaPagamento'];
  collectionChannel: string;
  contractNumber: string;
  titleCode: string;
  notes: string;
  source: string;
  importSource?: string;
  externalCustomerId?: string;
  sourceFile: string;
  createdAt: string | null;
}

export interface PayableDTO {
  id: string;
  companyId: string;
  supplierName: string;
  supplierDocument: string;
  documentNumber: string;
  description: string;
  category: string;
  categoryName: string;
  amountCents: number;
  grossAmountCents?: number;
  paidAmountCents?: number | null;
  remainingAmountCents?: number | null;
  issueDate?: string | null;
  dueDate: string | null;
  paymentDate: string | null;
  status: string;
  paymentMethod: ContaPagar['formaPagamento'];
  notes: string;
  source: string;
  importSource?: string;
  externalCustomerId?: string;
  titleCode?: string;
  installment?: string;
  bank?: string;
  costCenter?: string;
  account?: string;
  sourceFile: string;
  createdAt: string | null;
}

export function mapReceivable(dto: ReceivableDTO): ContaReceber {
  return {
    id: dto.id,
    companyId: dto.companyId,
    clienteId: partyId(dto.customerName),
    clienteNome: dto.customerName,
    documento: dto.documentNumber,
    descricao: dto.description,
    categoriaId: dto.category,
    categoriaNome: dto.categoryName,
    valor: centsToReais(dto.amountCents),
    vencimento: dto.dueDate ?? '',
    dataPagamento: dto.paymentDate ?? null,
    status: statusReceberFromApi(dto.status),
    formaPagamento: dto.paymentMethod,
    observacoes: dto.notes || undefined,
    criadoEm: dto.createdAt ?? dto.dueDate ?? '',
    valorBruto: centsToReais(dto.grossAmountCents || dto.amountCents),
    valorRecebido: dto.receivedAmountCents == null ? null : centsToReais(dto.receivedAmountCents),
    canalCobranca: dto.collectionChannel || undefined,
    numeroContrato: dto.contractNumber || undefined,
    codigoTitulo: dto.titleCode || undefined,
    origem: origemFromSource(dto.source),
    arquivoOrigem: dto.sourceFile || undefined,
    fonteImportacao: fonteImportacaoFromDto(dto.importSource),
    codigoClienteExterno: dto.externalCustomerId || undefined,
  };
}

export function mapPayable(dto: PayableDTO): ContaPagar {
  return {
    id: dto.id,
    companyId: dto.companyId,
    fornecedorId: partyId(dto.supplierName),
    fornecedorNome: dto.supplierName,
    documento: dto.documentNumber,
    descricao: dto.description,
    categoriaId: dto.category,
    categoriaNome: dto.categoryName,
    valor: centsToReais(dto.amountCents),
    vencimento: dto.dueDate ?? '',
    dataPagamento: dto.paymentDate ?? null,
    status: statusPagarFromApi(dto.status),
    formaPagamento: dto.paymentMethod,
    observacoes: dto.notes || undefined,
    criadoEm: dto.createdAt ?? dto.dueDate ?? '',
    valorBruto: dto.grossAmountCents != null ? centsToReais(dto.grossAmountCents) : undefined,
    valorPago: dto.paidAmountCents == null ? null : centsToReais(dto.paidAmountCents),
    saldo: dto.remainingAmountCents == null ? null : centsToReais(dto.remainingAmountCents),
    emissao: dto.issueDate ?? undefined,
    codigoTitulo: dto.titleCode || undefined,
    parcela: dto.installment || undefined,
    banco: dto.bank || undefined,
    centroCusto: dto.costCenter || undefined,
    conta: dto.account || undefined,
    fonteImportacao: dto.importSource === 'totvs' ? 'totvs' : dto.importSource === 'legacy' ? 'legacy' : undefined,
  };
}

export interface EnvelopeApi<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function mapPaginacao<TDto, TOut>(
  envelope: EnvelopeApi<TDto>,
  mapItem: (dto: TDto) => TOut,
): RespostaPaginada<TOut> {
  return {
    dados: envelope.data.map(mapItem),
    total: envelope.pagination.total,
    pagina: envelope.pagination.page,
    itensPorPagina: envelope.pagination.limit,
  };
}

/* ---------------------------- DASHBOARD ---------------------------- */

interface RankingDTO {
  id: string;
  nome: string;
  valorCents: number;
  quantidade: number;
}

export interface DashboardDTO {
  scope: string;
  receivable: { valorCents: number; quantidade: number; variacaoPercentual: number };
  payable: { valorCents: number; quantidade: number; variacaoPercentual: number };
  projectedBalanceCents: number;
  overdueReceivable: { valorCents: number; quantidade: number };
  overduePayable: { valorCents: number; quantidade: number };
  delinquency: { valorVencidoCents: number; quantidadeVencidos: number; percentual: number };
  totalReceivedCents: number;
  totalPaidCents: number;
  ticketMedioCents: number;
  maiorCliente: RankingDTO;
  maiorFornecedor: RankingDTO;
  taxaInadimplencia: number;
  fluxoCaixa: { label: string; receitasCents: number; despesasCents: number; saldoCents: number }[];
  topClientes: RankingDTO[];
  topFornecedores: RankingDTO[];
  categoriasDespesa: { categoriaId: string; categoriaNome: string; valorCents: number; cor: string }[];
  alertas: { id: string; nivel: 'critico' | 'atencao' | 'sucesso'; mensagem: string; detalhe?: string }[];
}

const mapRanking = (r: RankingDTO) => ({
  id: r.id,
  nome: r.nome,
  valor: centsToReais(r.valorCents),
  quantidade: r.quantidade,
});

export function mapDashboard(dto: DashboardDTO): DashboardFinanceiro {
  return {
    escopo: dto.scope,
    contasReceber: {
      valor: centsToReais(dto.receivable.valorCents),
      quantidade: dto.receivable.quantidade,
      variacaoPercentual: dto.receivable.variacaoPercentual,
    },
    contasPagar: {
      valor: centsToReais(dto.payable.valorCents),
      quantidade: dto.payable.quantidade,
      variacaoPercentual: dto.payable.variacaoPercentual,
    },
    saldoProjetado: centsToReais(dto.projectedBalanceCents),
    vencidoReceber: { valor: centsToReais(dto.overdueReceivable.valorCents), quantidade: dto.overdueReceivable.quantidade },
    vencidoPagar: { valor: centsToReais(dto.overduePayable.valorCents), quantidade: dto.overduePayable.quantidade },
    inadimplencia: {
      valorVencido: centsToReais(dto.delinquency.valorVencidoCents),
      quantidadeVencidos: dto.delinquency.quantidadeVencidos,
      percentual: dto.delinquency.percentual,
    },
    totalRecebido: centsToReais(dto.totalReceivedCents),
    totalPago: centsToReais(dto.totalPaidCents),
    ticketMedio: centsToReais(dto.ticketMedioCents),
    maiorCliente: mapRanking(dto.maiorCliente),
    maiorFornecedor: mapRanking(dto.maiorFornecedor),
    taxaInadimplencia: dto.taxaInadimplencia,
    fluxoCaixa: dto.fluxoCaixa.map((p) => ({
      label: p.label,
      receitas: centsToReais(p.receitasCents),
      despesas: centsToReais(p.despesasCents),
      saldo: centsToReais(p.saldoCents),
    })),
    topClientes: dto.topClientes.map(mapRanking),
    topFornecedores: dto.topFornecedores.map(mapRanking),
    categoriasDespesa: dto.categoriasDespesa.map((c) => ({
      categoriaId: c.categoriaId,
      categoriaNome: c.categoriaNome,
      valor: centsToReais(c.valorCents),
      cor: c.cor,
    })),
    alertas: dto.alertas,
  };
}

/* ------------------------- COMPANY METRICS ------------------------- */

export interface CompanyMetricsDTO {
  companyId: string;
  companyName: string;
  shortName: string;
  color: string;
  aReceberCents: number;
  aPagarCents: number;
  recebidoCents: number;
  pagoCents: number;
  saldoProjetadoCents: number;
  vencidoReceberCents: number;
  vencidoPagarCents: number;
  quantidadeReceber: number;
  quantidadePagar: number;
  taxaInadimplencia: number;
}

export function mapCompanyMetrics(dto: CompanyMetricsDTO): CompanyMetrics {
  return {
    companyId: dto.companyId,
    companyName: dto.companyName,
    shortName: dto.shortName,
    color: dto.color,
    aReceber: centsToReais(dto.aReceberCents),
    aPagar: centsToReais(dto.aPagarCents),
    recebido: centsToReais(dto.recebidoCents),
    pago: centsToReais(dto.pagoCents),
    saldoProjetado: centsToReais(dto.saldoProjetadoCents),
    vencidoReceber: centsToReais(dto.vencidoReceberCents),
    vencidoPagar: centsToReais(dto.vencidoPagarCents),
    quantidadeReceber: dto.quantidadeReceber,
    quantidadePagar: dto.quantidadePagar,
    taxaInadimplencia: dto.taxaInadimplencia,
  };
}

/* --------------------------- FLUXO DE CAIXA --------------------------- */

export interface CashFlowPointDTO {
  date: string;
  label: string;
  inflowCents: number;
  outflowCents: number;
  balanceCents: number;
}

export function mapCashFlowPoint(dto: CashFlowPointDTO): PontoFluxoCaixa {
  return {
    label: dto.label,
    receitas: centsToReais(dto.inflowCents),
    despesas: centsToReais(dto.outflowCents),
    saldo: centsToReais(dto.balanceCents),
  };
}

export interface CashFlowEntryDTO {
  id: string;
  companyId: string;
  data: string;
  descricao: string;
  tipo: 'entrada' | 'saida';
  categoriaNome: string;
  entradaCents: number;
  saidaCents: number;
  saldoCents: number;
  formaPagamento: LancamentoFluxoCaixa['formaPagamento'];
}

export function mapCashFlowEntry(dto: CashFlowEntryDTO): LancamentoFluxoCaixa {
  return {
    id: dto.id,
    companyId: dto.companyId,
    data: dto.data,
    descricao: dto.descricao,
    tipo: dto.tipo,
    categoriaNome: dto.categoriaNome,
    entrada: centsToReais(dto.entradaCents),
    saida: centsToReais(dto.saidaCents),
    saldo: centsToReais(dto.saldoCents),
    formaPagamento: dto.formaPagamento,
  };
}

export interface CashFlowSummaryDTO {
  openingBalanceCents: number;
  totalInflowCents: number;
  totalOutflowCents: number;
  closingBalanceCents: number;
}
