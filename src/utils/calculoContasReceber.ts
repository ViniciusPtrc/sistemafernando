import type { ContaReceber } from '@/types';

/**
 * Regras de negócio do Contas a Receber, centralizadas aqui para que nenhum
 * componente ou service precise reimplementar filtro/soma por conta própria.
 * Tudo aqui opera sobre `ContaReceber[]` já normalizado — nunca sobre a
 * planilha crua.
 */
export interface ResumoContasReceber {
  quantidadeTitulos: number;
  quantidadeClientes: number;
  /** Soma do valor original do documento, antes de retenções. */
  totalBruto: number;
  /** Soma do valor líquido (após retenções) — é o valor "devido" do título. */
  totalLiquido: number;
  recebido: number;
  emAberto: number;
  vencido: number;
  aVencer: number;
}

function resumoVazio(): ResumoContasReceber {
  return {
    quantidadeTitulos: 0,
    quantidadeClientes: 0,
    totalBruto: 0,
    totalLiquido: 0,
    recebido: 0,
    emAberto: 0,
    vencido: 0,
    aVencer: 0,
  };
}

/** Saldo em aberto de um título individual: valor líquido menos o que já foi recebido. */
export function calcularSaldoTitulo(conta: ContaReceber): number {
  return conta.valor - (conta.valorRecebido ?? 0);
}

/**
 * Resumo agregado de um conjunto de títulos. Cancelados são excluídos por
 * padrão porque não representam dinheiro em aberto nem recebido — passe
 * `incluirCancelados: true` só se precisar do bruto histórico completo.
 */
export function calcularResumoContasReceber(
  contas: ContaReceber[],
  opcoes: { incluirCancelados?: boolean } = {},
): ResumoContasReceber {
  const consideradas = opcoes.incluirCancelados ? contas : contas.filter((c) => c.status !== 'cancelado');

  const resumo = consideradas.reduce<ResumoContasReceber>((acc, conta) => {
    acc.totalBruto += conta.valorBruto;
    acc.totalLiquido += conta.valor;
    if (conta.status === 'recebido') acc.recebido += conta.valorRecebido ?? conta.valor;
    if (conta.status === 'vencido') acc.vencido += conta.valor;
    if (conta.status === 'a_vencer') acc.aVencer += conta.valor;
    if (conta.status === 'vencido' || conta.status === 'a_vencer') acc.emAberto += conta.valor;
    return acc;
  }, resumoVazio());

  resumo.quantidadeTitulos = consideradas.length;
  resumo.quantidadeClientes = new Set(consideradas.map((c) => c.clienteId)).size;
  return resumo;
}

export interface ResumoContasReceberPorEmpresa extends ResumoContasReceber {
  companyId: string;
}

export function agruparContasReceberPorEmpresa(contas: ContaReceber[]): ResumoContasReceberPorEmpresa[] {
  const empresas = Array.from(new Set(contas.map((c) => c.companyId)));
  return empresas.map((companyId) => ({
    companyId,
    ...calcularResumoContasReceber(contas.filter((c) => c.companyId === companyId)),
  }));
}

export interface ResumoContasReceberPorCliente extends ResumoContasReceber {
  clienteId: string;
  clienteNome: string;
  saldo: number;
  proximoVencimento: string | null;
}

export function agruparContasReceberPorCliente(contas: ContaReceber[]): ResumoContasReceberPorCliente[] {
  const clienteIds = Array.from(new Set(contas.map((c) => c.clienteId)));

  return clienteIds
    .map((clienteId) => {
      const doCliente = contas.filter((c) => c.clienteId === clienteId);
      const resumo = calcularResumoContasReceber(doCliente);
      const emAberto = doCliente.filter((c) => c.status === 'vencido' || c.status === 'a_vencer');
      const proximoVencimento = emAberto.reduce<string | null>((menor, conta) => {
        if (menor === null || conta.vencimento < menor) return conta.vencimento;
        return menor;
      }, null);

      return {
        clienteId,
        clienteNome: doCliente[0]?.clienteNome ?? '',
        saldo: emAberto.reduce((soma, c) => soma + calcularSaldoTitulo(c), 0),
        proximoVencimento,
        ...resumo,
      };
    })
    .sort((a, b) => b.saldo - a.saldo);
}

export interface PontoEvolucaoContasReceber {
  mes: string;
  recebido: number;
  vencido: number;
  aVencer: number;
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function mesLabel(iso: string): string {
  const [ano, mes] = iso.split('-').map(Number);
  return `${MESES[mes - 1]}/${String(ano).slice(2)}`;
}

function mesChave(iso: string): string {
  return iso.slice(0, 7);
}

/**
 * Agrupa por mês usando a data de recebimento para títulos recebidos e a
 * data de vencimento para os demais — a mesma convenção que o dashboard já
 * usava, só que centralizada aqui em vez de duplicada no service.
 */
export function agruparContasReceberPorMes(contas: ContaReceber[]): PontoEvolucaoContasReceber[] {
  const consideradas = contas.filter((c) => c.status !== 'cancelado');
  const mapa = new Map<string, PontoEvolucaoContasReceber>();

  for (const conta of consideradas) {
    const dataReferencia = conta.status === 'recebido' && conta.dataPagamento ? conta.dataPagamento : conta.vencimento;
    const chave = mesChave(dataReferencia);
    const atual = mapa.get(chave) ?? { mes: mesLabel(dataReferencia), recebido: 0, vencido: 0, aVencer: 0 };

    if (conta.status === 'recebido') atual.recebido += conta.valorRecebido ?? conta.valor;
    if (conta.status === 'vencido') atual.vencido += conta.valor;
    if (conta.status === 'a_vencer') atual.aVencer += conta.valor;

    mapa.set(chave, atual);
  }

  return Array.from(mapa.keys())
    .sort()
    .map((chave) => mapa.get(chave)!);
}
