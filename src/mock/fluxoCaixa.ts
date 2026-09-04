import type { LancamentoFluxoCaixa, PontoFluxoCaixa, ResumoFluxoCaixa } from '@/types';
import { ALL_COMPANIES, companies } from './companies';
import { contasPagarMock } from './contasPagar';
import { contasReceberMock } from './contasReceber';

export const SALDO_INICIAL_POR_EMPRESA: Record<string, number> = {
  'loc-tudo': 25_000,
  'alugue-tudo-evento': 12_000,
  'alugue-tudo-comercio': 8_000,
};

export function obterSaldoInicial(companyId?: string): number {
  if (companyId && companyId !== ALL_COMPANIES) {
    return SALDO_INICIAL_POR_EMPRESA[companyId] ?? 0;
  }
  return Object.values(SALDO_INICIAL_POR_EMPRESA).reduce((soma, valor) => soma + valor, 0);
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function mesLabel(iso: string): string {
  const [ano, mes] = iso.split('-').map(Number);
  return `${MESES[mes - 1].slice(0, 3)}/${String(ano).slice(2)}`;
}

function mesChave(iso: string): string {
  return iso.slice(0, 7);
}

function porEmpresa<T extends { companyId: string }>(itens: T[], companyId?: string): T[] {
  if (!companyId || companyId === ALL_COMPANIES) return itens;
  return itens.filter((item) => item.companyId === companyId);
}

export function gerarPontosFluxoCaixa(companyId?: string): PontoFluxoCaixa[] {
  const mapa = new Map<string, PontoFluxoCaixa>();

  const registrar = (iso: string, receita: number, despesa: number) => {
    const chave = mesChave(iso);
    const atual = mapa.get(chave) ?? { label: mesLabel(iso), receitas: 0, despesas: 0, saldo: 0 };
    atual.receitas += receita;
    atual.despesas += despesa;
    atual.saldo = atual.receitas - atual.despesas;
    mapa.set(chave, atual);
  };

  for (const conta of porEmpresa(contasReceberMock, companyId)) {
    if (conta.status === 'cancelado') continue;
    const dataReferencia = conta.dataPagamento ?? conta.vencimento;
    registrar(dataReferencia, conta.valor, 0);
  }

  for (const conta of porEmpresa(contasPagarMock, companyId)) {
    if (conta.status === 'cancelado') continue;
    const dataReferencia = conta.dataPagamento ?? conta.vencimento;
    registrar(dataReferencia, 0, conta.valor);
  }

  const chavesOrdenadas = Array.from(mapa.keys()).sort();
  return chavesOrdenadas.map((chave) => mapa.get(chave)!);
}

export function gerarLancamentos(companyId?: string): LancamentoFluxoCaixa[] {
  const lancamentos: Omit<LancamentoFluxoCaixa, 'saldo'>[] = [];

  for (const conta of porEmpresa(contasReceberMock, companyId)) {
    if (conta.status !== 'recebido' || !conta.dataPagamento) continue;
    lancamentos.push({
      id: `fc-cr-${conta.id}`,
      companyId: conta.companyId,
      data: conta.dataPagamento,
      descricao: `${conta.descricao} — ${conta.clienteNome}`,
      tipo: 'entrada',
      categoriaNome: conta.categoriaNome,
      entrada: conta.valor,
      saida: 0,
      formaPagamento: conta.formaPagamento,
    });
  }

  for (const conta of porEmpresa(contasPagarMock, companyId)) {
    if (conta.status !== 'pago' || !conta.dataPagamento) continue;
    lancamentos.push({
      id: `fc-cp-${conta.id}`,
      companyId: conta.companyId,
      data: conta.dataPagamento,
      descricao: `${conta.descricao} — ${conta.fornecedorNome}`,
      tipo: 'saida',
      categoriaNome: conta.categoriaNome,
      entrada: 0,
      saida: conta.valor,
      formaPagamento: conta.formaPagamento,
    });
  }

  lancamentos.sort((a, b) => (a.data < b.data ? -1 : 1));

  const saldoInicial = obterSaldoInicial(companyId);
  let saldoCorrente = saldoInicial;

  const comSaldo: LancamentoFluxoCaixa[] = lancamentos.map((lancamento) => {
    saldoCorrente += lancamento.entrada - lancamento.saida;
    return { ...lancamento, saldo: saldoCorrente };
  });

  return comSaldo.reverse();
}

export function gerarResumoFluxoCaixa(lancamentos: LancamentoFluxoCaixa[], saldoInicial: number): ResumoFluxoCaixa {
  const totalEntradas = lancamentos.reduce((soma, item) => soma + item.entrada, 0);
  const totalSaidas = lancamentos.reduce((soma, item) => soma + item.saida, 0);
  return {
    saldoInicial,
    totalEntradas,
    totalSaidas,
    saldoFinal: saldoInicial + totalEntradas - totalSaidas,
  };
}

export function gerarPontosComparativoEmpresas(): Record<string, number | string>[] {
  const mapa = new Map<string, Record<string, number | string>>();

  for (const empresa of companies) {
    const pontosEmpresa = gerarPontosFluxoCaixa(empresa.id);
    for (const ponto of pontosEmpresa) {
      const atual = mapa.get(ponto.label) ?? { label: ponto.label };
      atual[empresa.id] = ponto.saldo;
      mapa.set(ponto.label, atual);
    }
  }

  const consolidado = gerarPontosFluxoCaixa();

  return consolidado.map((ponto) => {
    const linha = mapa.get(ponto.label) ?? { label: ponto.label };
    for (const empresa of companies) {
      if (linha[empresa.id] === undefined) linha[empresa.id] = 0;
    }
    return linha;
  });
}
