/**
 * Conversão entre os DTOs do backend (inglês, valores em centavos, datas YYYY-MM-DD)
 * e os tipos que o front-end já usa (português, valores em reais). Concentrar tudo
 * aqui mantém componentes e páginas intactos.
 */
import type {
  BlocoItens,
  BlocoMaoDeObra,
  CapitalGiro,
  ClassificacaoMargem,
  ContaPagar,
  ContaReceber,
  Contrato,
  ContratoMargemDetalhe,
  ContratoProjecao,
  CustoContrato,
  DashboardFinanceiro,
  FormacaoPreco,
  LancamentoFluxoCaixa,
  LinhaAtivo,
  LinhaCombustivel,
  LinhaCusto,
  LinhaMaoDeObra,
  LinhaTributo,
  MargemMensal,
  MargemPorContrato,
  MargemResumo,
  PayableVinculavel,
  PontoFluxoCaixa,
  RascunhoFormacaoPreco,
  ReceitaVinculavel,
  RespostaPaginada,
  StatusConta,
  StatusContrato,
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

/* ----------------------------- MARGEM DE CONTRATOS ----------------------------- */

export interface ContractDTO {
  id: string;
  companyId: string;
  number: string;
  customerName: string;
  customerDocument: string;
  contractedValueCents: number;
  monthlyRevenueCents?: number;
  startDate: string | null;
  endDate: string | null;
  status: StatusContrato;
  notes: string;
}

export function mapContract(dto: ContractDTO): Contrato {
  return {
    id: dto.id,
    companyId: dto.companyId,
    numero: dto.number,
    clienteNome: dto.customerName,
    clienteDocumento: dto.customerDocument,
    valorContratadoCents: dto.contractedValueCents,
    faturamentoMensalCents: dto.monthlyRevenueCents ?? 0,
    dataInicio: dto.startDate ?? '',
    dataFim: dto.endDate,
    status: dto.status,
    observacoes: dto.notes,
  };
}

interface ClassificacaoDTO {
  nivel: ClassificacaoMargem['nivel'];
  label: string;
}

export interface MarginSummaryDTO {
  period: string;
  range: { from: string | null; to: string | null };
  contratosNoEscopo: number;
  receitaCents: number;
  custosCents: number;
  lucroCents: number;
  margemPct: number | null;
  receitaRecebidaCents: number;
  receitaPendenteCents: number;
  custosProjetadosCents: number;
  lucroProjetadoCents: number;
  margemProjetadaPct: number | null;
  classificacao: ClassificacaoDTO;
}

export function mapMarginSummary(dto: MarginSummaryDTO): MargemResumo {
  return {
    period: dto.period,
    range: dto.range,
    contratosNoEscopo: dto.contratosNoEscopo,
    receita: centsToReais(dto.receitaCents),
    custos: centsToReais(dto.custosCents),
    lucro: centsToReais(dto.lucroCents),
    margemPct: dto.margemPct,
    receitaRecebida: centsToReais(dto.receitaRecebidaCents),
    receitaPendente: centsToReais(dto.receitaPendenteCents),
    custosProjetados: centsToReais(dto.custosProjetadosCents),
    lucroProjetado: centsToReais(dto.lucroProjetadoCents),
    margemProjetadaPct: dto.margemProjetadaPct,
    classificacao: dto.classificacao,
  };
}

export interface MarginMonthlyDTO {
  mes: string;
  chave: string;
  receitaCents: number;
  custosCents: number;
  lucroCents: number;
  margemPct: number | null;
}

export function mapMarginMonthly(dto: MarginMonthlyDTO): MargemMensal {
  return {
    mes: dto.mes,
    chave: dto.chave,
    receita: centsToReais(dto.receitaCents),
    custos: centsToReais(dto.custosCents),
    lucro: centsToReais(dto.lucroCents),
    margemPct: dto.margemPct,
  };
}

export interface MarginByContractDTO {
  contractId: string;
  number: string;
  customerName: string;
  status: StatusContrato;
  receitaCents: number;
  custosCents: number;
  lucroCents: number;
  margemPct: number | null;
  classificacao: ClassificacaoDTO;
}

export function mapMarginByContract(dto: MarginByContractDTO): MargemPorContrato {
  return {
    contractId: dto.contractId,
    numero: dto.number,
    clienteNome: dto.customerName,
    status: dto.status,
    receita: centsToReais(dto.receitaCents),
    custos: centsToReais(dto.custosCents),
    lucro: centsToReais(dto.lucroCents),
    margemPct: dto.margemPct,
    classificacao: dto.classificacao,
  };
}

export interface ContractMarginDTO {
  contract: {
    id: string;
    companyId: string;
    number: string;
    customerName: string;
    customerDocument: string;
    contractedValueCents: number;
    monthlyRevenueCents?: number;
    status: StatusContrato;
    startDate: string | null;
    endDate: string | null;
    notes: string;
  };
  period: string;
  range: { from: string | null; to: string | null };
  receitaCents: number;
  receitaRecebidaCents: number;
  receitaPendenteCents: number;
  receitaBase?: 'vinculada' | 'faturamento_mensal';
  custosRealizadosCents: number;
  custosProjetadosCents: number;
  lucroAtualCents: number;
  lucroProjetadoCents: number;
  margemAtualPct: number | null;
  margemProjetadaPct: number | null;
  classificacao: ClassificacaoDTO;
}

export function mapContractMargin(dto: ContractMarginDTO): ContratoMargemDetalhe {
  return {
    contrato: {
      id: dto.contract.id,
      companyId: dto.contract.companyId,
      numero: dto.contract.number,
      clienteNome: dto.contract.customerName,
      clienteDocumento: dto.contract.customerDocument,
      valorContratadoCents: dto.contract.contractedValueCents,
      faturamentoMensalCents: dto.contract.monthlyRevenueCents ?? 0,
      status: dto.contract.status,
      dataInicio: dto.contract.startDate ?? '',
      dataFim: dto.contract.endDate,
      observacoes: dto.contract.notes,
    },
    period: dto.period,
    range: dto.range,
    receita: centsToReais(dto.receitaCents),
    receitaRecebida: centsToReais(dto.receitaRecebidaCents),
    receitaPendente: centsToReais(dto.receitaPendenteCents),
    receitaBase: dto.receitaBase ?? 'vinculada',
    custosRealizados: centsToReais(dto.custosRealizadosCents),
    custosProjetados: centsToReais(dto.custosProjetadosCents),
    lucroAtual: centsToReais(dto.lucroAtualCents),
    lucroProjetado: centsToReais(dto.lucroProjetadoCents),
    margemAtualPct: dto.margemAtualPct,
    margemProjetadaPct: dto.margemProjetadaPct,
    classificacao: dto.classificacao,
  };
}

export interface ContractCostDTO {
  id: string;
  contractId: string;
  origin: 'manual' | 'payable';
  type: 'realizado' | 'projetado';
  payableId: string | null;
  description: string;
  category: string;
  categoryName: string;
  supplierName: string;
  amountCents: number;
  date: string | null;
  recurrence?: 'once' | 'installment' | 'fixed';
  installments?: number | null;
  recurrenceEndDate?: string | null;
  notes: string;
}

export function mapContractCost(dto: ContractCostDTO): CustoContrato {
  return {
    id: dto.id,
    contractId: dto.contractId,
    origem: dto.origin,
    tipo: dto.type,
    payableId: dto.payableId,
    descricao: dto.description,
    categoria: dto.category,
    categoriaNome: dto.categoryName,
    fornecedorNome: dto.supplierName,
    valor: centsToReais(dto.amountCents),
    data: dto.date,
    recorrencia: dto.recurrence ?? 'once',
    parcelas: dto.installments ?? null,
    recorrenciaFim: dto.recurrenceEndDate ?? null,
    observacoes: dto.notes,
  };
}

export interface ContractProjectionDTO {
  contract: { id: string; number: string; customerName: string; status: StatusContrato; endDate: string | null };
  months: number;
  monthlyRevenueCents: number;
  range: { from: string; to: string };
  meses: { mes: string; chave: string; receitaCents: number; custosCents: number; lucroCents: number; margemPct: number | null }[];
  totais: {
    receitaCents: number;
    custosCents: number;
    lucroCents: number;
    margemPct: number | null;
    margemMediaPct: number | null;
    classificacao: ClassificacaoDTO;
  };
}

export function mapContractProjection(dto: ContractProjectionDTO): ContratoProjecao {
  return {
    contrato: {
      id: dto.contract.id,
      numero: dto.contract.number,
      clienteNome: dto.contract.customerName,
      status: dto.contract.status,
      dataFim: dto.contract.endDate,
    },
    meses: dto.months,
    faturamentoMensalCents: dto.monthlyRevenueCents,
    range: dto.range,
    linha: dto.meses.map((m) => ({
      mes: m.mes,
      chave: m.chave,
      receita: centsToReais(m.receitaCents),
      custos: centsToReais(m.custosCents),
      lucro: centsToReais(m.lucroCents),
      margemPct: m.margemPct,
    })),
    totais: {
      receita: centsToReais(dto.totais.receitaCents),
      custos: centsToReais(dto.totais.custosCents),
      lucro: centsToReais(dto.totais.lucroCents),
      margemPct: dto.totais.margemPct,
      margemMediaPct: dto.totais.margemMediaPct,
      classificacao: dto.totais.classificacao,
    },
  };
}

export interface LinkableReceivableDTO {
  id: string;
  customerName: string;
  documentNumber: string;
  dueDate: string | null;
  amountCents: number;
  status: string;
}

export function mapLinkableReceivable(dto: LinkableReceivableDTO): ReceitaVinculavel {
  return {
    id: dto.id,
    clienteNome: dto.customerName,
    documento: dto.documentNumber,
    vencimento: dto.dueDate,
    valor: centsToReais(dto.amountCents),
    status: dto.status,
  };
}

export interface LinkablePayableDTO {
  id: string;
  supplierName: string;
  documentNumber: string;
  categoryName: string;
  dueDate: string | null;
  amountCents: number;
  status: string;
}

export function mapLinkablePayable(dto: LinkablePayableDTO): PayableVinculavel {
  return {
    id: dto.id,
    fornecedorNome: dto.supplierName,
    documento: dto.documentNumber,
    categoriaNome: dto.categoryName,
    vencimento: dto.dueDate,
    valor: centsToReais(dto.amountCents),
    status: dto.status,
  };
}

/* ------------------------------ Formação de Preço ------------------------------ */

interface LineItemDTO {
  _id: string;
  description: string;
  quantity: number;
  timesPerYear: number;
  unitCostCents: number;
}

interface LaborLineItemDTO {
  _id: string;
  description: string;
  quantity: number;
  monthlySalaryCents: number;
  dailyHoursDedication: number;
  timesPerYear: number;
}

interface TaxLineItemDTO {
  _id: string;
  name: string;
  ratePercent: number;
  note: string;
}

interface AssetItemDTO {
  _id: string;
  description: string;
  quantity: number;
  unitCostCents: number;
}

interface FuelItemDTO {
  _id: string;
  description: string;
  quantity: number;
  kmPerYear: number;
  kmPerLiter: number;
  pricePerLiterCents: number;
}

interface LaborBlockDTO {
  items: LaborLineItemDTO[];
  payrollChargesPercent: number;
  overtimePercent: number;
  hazardPayPercent: number;
  otherAllowancesPercent: number;
}

interface ItemsBlockDTO {
  items: LineItemDTO[];
}

interface EquipmentBlockDTO {
  items: AssetItemDTO[];
  residualValuePercent: number;
  capitalMonthlyRatePercent: number;
  capitalPeriodMonths: number;
}

interface VehicleBlockDTO {
  depreciationItems: AssetItemDTO[];
  residualValuePercent: number;
  capitalMonthlyRatePercent: number;
  capitalPeriodMonths: number;
  maintenanceItems: LineItemDTO[];
  fuelItems: FuelItemDTO[];
}

interface OtherLaborCostsBlockDTO {
  medicalExpenses: ItemsBlockDTO;
  subcontracting: ItemsBlockDTO;
}

interface TaxesBlockDTO {
  items: TaxLineItemDTO[];
}

interface WorkingCapitalDTO {
  receiptTermDays: number;
  paymentTermDays: number;
  monthlyFinancialRatePercent: number;
  otherInitialInvestmentCents: number;
}

interface ResultadoBlocoMaoDeObraDTO {
  subtotalCents: number;
  payrollChargesValueCents: number;
  overtimeValueCents: number;
  hazardPayValueCents: number;
  otherAllowancesValueCents: number;
  totalCents: number;
}

interface ResultadoBlocoAtivoDTO {
  acquisitionCostCents: number;
  residualValueCents: number;
  depreciationCents: number;
  capitalReturnCents: number;
  totalCents: number;
}

interface LinhaDreDTO {
  label: string;
  valorCents: number;
  percentualDaReceita: number;
}

interface ComparacaoReferenciaDTO {
  referencePriceCents: number;
  lucroRealCents: number;
  margemRealPct: number;
  viavel: boolean;
  diferencaCents: number | null;
}

interface ResultadoDTO {
  maoDeObra: {
    direta: ResultadoBlocoMaoDeObraDTO;
    indireta: ResultadoBlocoMaoDeObraDTO;
    assistenciaMedicaCents: number;
    despesaMoradiaCents: number;
    uniformeEpiCents: number;
    alimentacaoCents: number;
    outrosCustosCents: number;
    totalCents: number;
  };
  materiais: { aplicacaoCents: number; outrosCents: number; totalCents: number };
  equipamentos: ResultadoBlocoAtivoDTO;
  veiculos: { depreciacao: ResultadoBlocoAtivoDTO; manutencaoCents: number; combustivelCents: number; totalCents: number };
  totalCustosDiretosCents: number;
  custosIndiretosValorCents: number;
  lucroValorCents: number;
  tributosValorCents: number;
  precoMinimoCents: number | null;
  precoEquilibrioCents: number | null;
  markupPercent: number | null;
  valorMensalCents: number | null;
  valorAnualCents: number | null;
  valorPorUnidadeCents: number | null;
  contingenciaValorCents: number;
  custoFinanceiroValorCents: number;
  totalCustosComContingenciaCents: number;
  capitalGiroNecessarioCents: number;
  investimentoInicialCents: number;
  roiTotalPercent: number | null;
  roiAnualPercent: number | null;
  paybackMeses: number | null;
  dre: LinhaDreDTO[];
  comparacaoReferencia: ComparacaoReferenciaDTO | null;
  totalServicosDfpCents: number | null;
  receitaAnualInformadaCents: number | null;
  resultadoContratoInformadoCents: number | null;
}

export interface PriceFormationDTO {
  id: string;
  companyId: string;
  name: string;
  agency: string;
  object: string;
  biddingNumber: string;
  taxRegime: string;
  notes: string;
  directLabor: LaborBlockDTO;
  indirectLabor: LaborBlockDTO;
  medicalAssistance: ItemsBlockDTO;
  housingExpense: ItemsBlockDTO;
  uniformAndPpe: ItemsBlockDTO;
  foodAllowance: ItemsBlockDTO;
  otherLaborCosts: OtherLaborCostsBlockDTO;
  materialsApplication: ItemsBlockDTO;
  otherMaterials: ItemsBlockDTO;
  equipment: EquipmentBlockDTO;
  vehicles: VehicleBlockDTO;
  contractMonths: number;
  unitCount: number | null;
  dailyFullTimeHours: number;
  taxes: TaxesBlockDTO;
  contingencyPercent: number;
  workingCapital: WorkingCapitalDTO;
  indirectCostsPercent: number;
  profitPercent: number;
  costBasedTaxesPercent: number;
  revenueBasedTaxesPercent: number;
  informedMonthlyRevenueCents: number | null;
  referencePriceCents: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  resultado: ResultadoDTO;
}

function mapLinhaCusto(dto: LineItemDTO): LinhaCusto {
  return { id: dto._id, descricao: dto.description, quantidade: dto.quantity, vezesPorAno: dto.timesPerYear, valorUnitario: centsToReais(dto.unitCostCents) };
}

function mapLinhaMaoDeObra(dto: LaborLineItemDTO): LinhaMaoDeObra {
  return {
    id: dto._id,
    descricao: dto.description,
    quantidade: dto.quantity,
    meses: dto.timesPerYear,
    dedicacaoHorasDia: dto.dailyHoursDedication,
    salarioMensal: centsToReais(dto.monthlySalaryCents),
  };
}

function mapLinhaTributo(dto: TaxLineItemDTO): LinhaTributo {
  return { id: dto._id, nome: dto.name, aliquotaPercent: dto.ratePercent, observacao: dto.note ?? '' };
}

function mapLinhaAtivo(dto: AssetItemDTO): LinhaAtivo {
  return { id: dto._id, descricao: dto.description, quantidade: dto.quantity, valorUnitario: centsToReais(dto.unitCostCents) };
}

function mapLinhaCombustivel(dto: FuelItemDTO): LinhaCombustivel {
  return { id: dto._id, descricao: dto.description, quantidade: dto.quantity, kmPorAno: dto.kmPerYear, kmPorLitro: dto.kmPerLiter, precoLitro: centsToReais(dto.pricePerLiterCents) };
}

function mapBlocoMaoDeObra(dto: LaborBlockDTO): BlocoMaoDeObra {
  return {
    itens: dto.items.map(mapLinhaMaoDeObra),
    encargosSociaisPercent: dto.payrollChargesPercent,
    horaExtraPercent: dto.overtimePercent,
    periculosidadePercent: dto.hazardPayPercent,
    outrosAdicionaisPercent: dto.otherAllowancesPercent,
  };
}

function mapBlocoItens(dto: ItemsBlockDTO): BlocoItens {
  return { itens: dto.items.map(mapLinhaCusto) };
}

function mapCapitalGiro(dto: WorkingCapitalDTO): CapitalGiro {
  return {
    prazoRecebimentoDias: dto.receiptTermDays,
    prazoPagamentoDias: dto.paymentTermDays,
    taxaFinanceiraMensalPercent: dto.monthlyFinancialRatePercent,
    outrosInvestimentosIniciais: centsToReais(dto.otherInitialInvestmentCents),
  };
}

function mapResultadoBlocoMaoDeObra(dto: ResultadoBlocoMaoDeObraDTO) {
  return {
    subtotal: centsToReais(dto.subtotalCents),
    encargosSociaisValor: centsToReais(dto.payrollChargesValueCents),
    horaExtraValor: centsToReais(dto.overtimeValueCents),
    periculosidadeValor: centsToReais(dto.hazardPayValueCents),
    outrosAdicionaisValor: centsToReais(dto.otherAllowancesValueCents),
    total: centsToReais(dto.totalCents),
  };
}

function mapResultadoBlocoAtivo(dto: ResultadoBlocoAtivoDTO) {
  return {
    custoAquisicao: centsToReais(dto.acquisitionCostCents),
    valorResidual: centsToReais(dto.residualValueCents),
    depreciacao: centsToReais(dto.depreciationCents),
    remuneracaoCapital: centsToReais(dto.capitalReturnCents),
    total: centsToReais(dto.totalCents),
  };
}

export function mapPriceFormation(dto: PriceFormationDTO): FormacaoPreco {
  return {
    id: dto.id,
    companyId: dto.companyId,
    nome: dto.name,
    orgao: dto.agency,
    objeto: dto.object,
    numeroPregao: dto.biddingNumber,
    regimeTributario: (dto.taxRegime as FormacaoPreco['regimeTributario']) || '',
    observacoes: dto.notes,
    maoDeObraDireta: mapBlocoMaoDeObra(dto.directLabor),
    maoDeObraIndireta: mapBlocoMaoDeObra(dto.indirectLabor),
    assistenciaMedica: mapBlocoItens(dto.medicalAssistance),
    despesaMoradia: mapBlocoItens(dto.housingExpense),
    uniformeEpi: mapBlocoItens(dto.uniformAndPpe),
    alimentacao: mapBlocoItens(dto.foodAllowance),
    outrosCustosMaoDeObra: {
      despesasMedicas: mapBlocoItens(dto.otherLaborCosts.medicalExpenses),
      subcontratacoes: mapBlocoItens(dto.otherLaborCosts.subcontracting),
    },
    materiaisAplicacao: mapBlocoItens(dto.materialsApplication),
    outrosMateriais: mapBlocoItens(dto.otherMaterials),
    equipamentos: {
      itens: dto.equipment.items.map(mapLinhaAtivo),
      valorResidualPercent: dto.equipment.residualValuePercent,
      capitalTaxaMensalPercent: dto.equipment.capitalMonthlyRatePercent,
      capitalPeriodoMeses: dto.equipment.capitalPeriodMonths,
    },
    veiculos: {
      itensDepreciacao: dto.vehicles.depreciationItems.map(mapLinhaAtivo),
      valorResidualPercent: dto.vehicles.residualValuePercent,
      capitalTaxaMensalPercent: dto.vehicles.capitalMonthlyRatePercent,
      capitalPeriodoMeses: dto.vehicles.capitalPeriodMonths,
      itensManutencao: dto.vehicles.maintenanceItems.map(mapLinhaCusto),
      itensCombustivel: dto.vehicles.fuelItems.map(mapLinhaCombustivel),
    },
    mesesContrato: dto.contractMonths,
    jornadaIntegralHorasDia: dto.dailyFullTimeHours,
    quantidadeUnidades: dto.unitCount,
    tributos: { itens: dto.taxes.items.map(mapLinhaTributo) },
    contingenciaPercent: dto.contingencyPercent,
    capitalGiro: mapCapitalGiro(dto.workingCapital),
    custosIndiretosPercent: dto.indirectCostsPercent,
    lucroPercent: dto.profitPercent,
    tributosSobreCustoPercent: dto.costBasedTaxesPercent,
    tributosSobreReceitaPercent: dto.revenueBasedTaxesPercent,
    receitaMensalInformada: dto.informedMonthlyRevenueCents == null ? null : centsToReais(dto.informedMonthlyRevenueCents),
    precoReferencia: dto.referencePriceCents == null ? null : centsToReais(dto.referencePriceCents),
    criadoEm: dto.createdAt,
    atualizadoEm: dto.updatedAt,
    resultado: {
      maoDeObra: {
        direta: mapResultadoBlocoMaoDeObra(dto.resultado.maoDeObra.direta),
        indireta: mapResultadoBlocoMaoDeObra(dto.resultado.maoDeObra.indireta),
        assistenciaMedica: centsToReais(dto.resultado.maoDeObra.assistenciaMedicaCents),
        despesaMoradia: centsToReais(dto.resultado.maoDeObra.despesaMoradiaCents),
        uniformeEpi: centsToReais(dto.resultado.maoDeObra.uniformeEpiCents),
        alimentacao: centsToReais(dto.resultado.maoDeObra.alimentacaoCents),
        outrosCustos: centsToReais(dto.resultado.maoDeObra.outrosCustosCents),
        total: centsToReais(dto.resultado.maoDeObra.totalCents),
      },
      materiais: {
        aplicacao: centsToReais(dto.resultado.materiais.aplicacaoCents),
        outros: centsToReais(dto.resultado.materiais.outrosCents),
        total: centsToReais(dto.resultado.materiais.totalCents),
      },
      equipamentos: mapResultadoBlocoAtivo(dto.resultado.equipamentos),
      veiculos: {
        depreciacao: mapResultadoBlocoAtivo(dto.resultado.veiculos.depreciacao),
        manutencao: centsToReais(dto.resultado.veiculos.manutencaoCents),
        combustivel: centsToReais(dto.resultado.veiculos.combustivelCents),
        total: centsToReais(dto.resultado.veiculos.totalCents),
      },
      totalCustosDiretos: centsToReais(dto.resultado.totalCustosDiretosCents),
      custosIndiretosValor: centsToReais(dto.resultado.custosIndiretosValorCents),
      lucroValor: centsToReais(dto.resultado.lucroValorCents),
      tributosValor: centsToReais(dto.resultado.tributosValorCents),
      precoMinimo: dto.resultado.precoMinimoCents == null ? null : centsToReais(dto.resultado.precoMinimoCents),
      precoEquilibrio: dto.resultado.precoEquilibrioCents == null ? null : centsToReais(dto.resultado.precoEquilibrioCents),
      markupPercent: dto.resultado.markupPercent,
      valorMensal: dto.resultado.valorMensalCents == null ? null : centsToReais(dto.resultado.valorMensalCents),
      valorAnual: dto.resultado.valorAnualCents == null ? null : centsToReais(dto.resultado.valorAnualCents),
      valorPorUnidade: dto.resultado.valorPorUnidadeCents == null ? null : centsToReais(dto.resultado.valorPorUnidadeCents),
      contingenciaValor: centsToReais(dto.resultado.contingenciaValorCents),
      custoFinanceiroValor: centsToReais(dto.resultado.custoFinanceiroValorCents),
      totalCustosComContingencia: centsToReais(dto.resultado.totalCustosComContingenciaCents),
      capitalGiroNecessario: centsToReais(dto.resultado.capitalGiroNecessarioCents),
      investimentoInicial: centsToReais(dto.resultado.investimentoInicialCents),
      roiTotalPercent: dto.resultado.roiTotalPercent,
      roiAnualPercent: dto.resultado.roiAnualPercent,
      paybackMeses: dto.resultado.paybackMeses,
      dre: dto.resultado.dre.map((l) => ({ label: l.label, valor: centsToReais(l.valorCents), percentualDaReceita: l.percentualDaReceita })),
      comparacaoReferencia:
        dto.resultado.comparacaoReferencia == null
          ? null
          : {
              precoReferencia: centsToReais(dto.resultado.comparacaoReferencia.referencePriceCents),
              lucroReal: centsToReais(dto.resultado.comparacaoReferencia.lucroRealCents),
              margemRealPct: dto.resultado.comparacaoReferencia.margemRealPct,
              viavel: dto.resultado.comparacaoReferencia.viavel,
              diferenca: dto.resultado.comparacaoReferencia.diferencaCents == null ? null : centsToReais(dto.resultado.comparacaoReferencia.diferencaCents),
            },
      totalServicosDfp: dto.resultado.totalServicosDfpCents == null ? null : centsToReais(dto.resultado.totalServicosDfpCents),
      receitaAnualInformada: dto.resultado.receitaAnualInformadaCents == null ? null : centsToReais(dto.resultado.receitaAnualInformadaCents),
      resultadoContratoInformado: dto.resultado.resultadoContratoInformadoCents == null ? null : centsToReais(dto.resultado.resultadoContratoInformadoCents),
    },
  };
}

const reaisParaCentavos = (v: number): number => Math.round((v || 0) * 100);

function payloadLinhaCusto(l: LinhaCusto) {
  return { description: l.descricao.trim(), quantity: l.quantidade, timesPerYear: l.vezesPorAno, unitCostCents: reaisParaCentavos(l.valorUnitario) };
}

function payloadLinhaMaoDeObra(l: LinhaMaoDeObra) {
  return {
    description: l.descricao.trim(),
    quantity: l.quantidade,
    monthlySalaryCents: reaisParaCentavos(l.salarioMensal),
    dailyHoursDedication: l.dedicacaoHorasDia,
    timesPerYear: l.meses,
  };
}

function payloadLinhaTributo(l: LinhaTributo) {
  return { name: l.nome.trim(), ratePercent: l.aliquotaPercent, note: l.observacao.trim() };
}

function payloadLinhaAtivo(l: LinhaAtivo) {
  return { description: l.descricao.trim(), quantity: l.quantidade, unitCostCents: reaisParaCentavos(l.valorUnitario) };
}

function payloadLinhaCombustivel(l: LinhaCombustivel) {
  return { description: l.descricao.trim(), quantity: l.quantidade, kmPerYear: l.kmPorAno, kmPerLiter: l.kmPorLitro || 1, pricePerLiterCents: reaisParaCentavos(l.precoLitro) };
}

function payloadBlocoMaoDeObra(b: BlocoMaoDeObra) {
  return {
    items: b.itens.map(payloadLinhaMaoDeObra),
    payrollChargesPercent: b.encargosSociaisPercent,
    overtimePercent: b.horaExtraPercent,
    hazardPayPercent: b.periculosidadePercent,
    otherAllowancesPercent: b.outrosAdicionaisPercent,
  };
}

export function buildPriceFormationPayload(f: RascunhoFormacaoPreco) {
  return {
    companyId: f.companyId,
    name: f.nome.trim(),
    agency: f.orgao.trim(),
    object: f.objeto.trim(),
    biddingNumber: f.numeroPregao.trim(),
    taxRegime: f.regimeTributario || '',
    notes: f.observacoes.trim(),
    directLabor: payloadBlocoMaoDeObra(f.maoDeObraDireta),
    indirectLabor: payloadBlocoMaoDeObra(f.maoDeObraIndireta),
    medicalAssistance: { items: f.assistenciaMedica.itens.map(payloadLinhaCusto) },
    housingExpense: { items: f.despesaMoradia.itens.map(payloadLinhaCusto) },
    uniformAndPpe: { items: f.uniformeEpi.itens.map(payloadLinhaCusto) },
    foodAllowance: { items: f.alimentacao.itens.map(payloadLinhaCusto) },
    otherLaborCosts: {
      medicalExpenses: { items: f.outrosCustosMaoDeObra.despesasMedicas.itens.map(payloadLinhaCusto) },
      subcontracting: { items: f.outrosCustosMaoDeObra.subcontratacoes.itens.map(payloadLinhaCusto) },
    },
    materialsApplication: { items: f.materiaisAplicacao.itens.map(payloadLinhaCusto) },
    otherMaterials: { items: f.outrosMateriais.itens.map(payloadLinhaCusto) },
    equipment: {
      items: f.equipamentos.itens.map(payloadLinhaAtivo),
      residualValuePercent: f.equipamentos.valorResidualPercent,
      capitalMonthlyRatePercent: f.equipamentos.capitalTaxaMensalPercent,
      capitalPeriodMonths: f.equipamentos.capitalPeriodoMeses,
    },
    vehicles: {
      depreciationItems: f.veiculos.itensDepreciacao.map(payloadLinhaAtivo),
      residualValuePercent: f.veiculos.valorResidualPercent,
      capitalMonthlyRatePercent: f.veiculos.capitalTaxaMensalPercent,
      capitalPeriodMonths: f.veiculos.capitalPeriodoMeses,
      maintenanceItems: f.veiculos.itensManutencao.map(payloadLinhaCusto),
      fuelItems: f.veiculos.itensCombustivel.map(payloadLinhaCombustivel),
    },
    contractMonths: f.mesesContrato,
    dailyFullTimeHours: f.jornadaIntegralHorasDia,
    unitCount: f.quantidadeUnidades,
    taxes: { items: f.tributos.itens.map(payloadLinhaTributo) },
    contingencyPercent: f.contingenciaPercent,
    workingCapital: {
      receiptTermDays: f.capitalGiro.prazoRecebimentoDias,
      paymentTermDays: f.capitalGiro.prazoPagamentoDias,
      monthlyFinancialRatePercent: f.capitalGiro.taxaFinanceiraMensalPercent,
      otherInitialInvestmentCents: reaisParaCentavos(f.capitalGiro.outrosInvestimentosIniciais),
    },
    indirectCostsPercent: f.custosIndiretosPercent,
    profitPercent: f.lucroPercent,
    costBasedTaxesPercent: f.tributosSobreCustoPercent,
    revenueBasedTaxesPercent: f.tributosSobreReceitaPercent,
    informedMonthlyRevenueCents: f.receitaMensalInformada == null ? null : reaisParaCentavos(f.receitaMensalInformada),
    referencePriceCents: f.precoReferencia == null ? null : reaisParaCentavos(f.precoReferencia),
  };
}
