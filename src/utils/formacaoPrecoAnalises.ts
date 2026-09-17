import { calcularResultado } from './formacaoPrecoCalculo';
import type { LinhaCusto, RascunhoFormacaoPreco, ResultadoFormacaoPreco } from '@/types';

/**
 * Simulações derivadas do resultado já calculado (fluxo de caixa, cenários,
 * sensibilidade, validações). Tudo aqui é 100% cliente — não persiste no backend,
 * é só uma lente adicional sobre os mesmos dados da simulação. A simulação
 * plurianual (reajustes ano a ano) vive à parte, em `formacaoPrecoProjecaoAnual.ts`.
 */

/* ------------------------------- Fluxo de caixa ------------------------------- */

export interface MesFluxoCaixa {
  mes: number;
  entradas: number;
  saidas: number;
  saldoMensal: number;
  saldoAcumulado: number;
}

export interface ResultadoFluxoCaixa {
  meses: MesFluxoCaixa[];
  necessidadeMaximaCaixa: number;
  mesDeMaiorNecessidade: number | null;
}

/**
 * Distingue resultado econômico (competência, já no DRE) de fluxo de caixa (caixa,
 * deslocado pelos prazos de recebimento/pagamento). Simplificação deliberada: todo
 * custo operacional (mão de obra + materiais + veículos + administração + tributos)
 * é tratado com o mesmo prazo de pagamento — na prática, mão de obra costuma ser à
 * vista e fornecedores a prazo, mas separar isso exigiria mais premissas do que a
 * simulação hoje coleta.
 */
export function simularFluxoCaixa(f: RascunhoFormacaoPreco, resultado: ResultadoFormacaoPreco): ResultadoFluxoCaixa {
  const mesesContrato = f.mesesContrato || 12;
  const receitaMensal = resultado.valorMensal ?? 0;
  const custoCaixaMensal =
    (resultado.maoDeObra.total + resultado.materiais.total + resultado.veiculos.manutencao + resultado.veiculos.combustivel + resultado.custosIndiretosValor + resultado.tributosValor) /
    mesesContrato;

  const atrasoRecebimento = Math.round((f.capitalGiro.prazoRecebimentoDias || 0) / 30);
  const atrasoPagamento = Math.round((f.capitalGiro.prazoPagamentoDias || 0) / 30);
  const horizonte = mesesContrato + Math.max(atrasoRecebimento, atrasoPagamento) + 1;

  const entradasPorMes = new Array(horizonte + 1).fill(0);
  const saidasPorMes = new Array(horizonte + 1).fill(0);
  for (let m = 1; m <= mesesContrato; m++) {
    entradasPorMes[m + atrasoRecebimento] = (entradasPorMes[m + atrasoRecebimento] ?? 0) + receitaMensal;
    saidasPorMes[m + atrasoPagamento] = (saidasPorMes[m + atrasoPagamento] ?? 0) + custoCaixaMensal;
  }

  const meses: MesFluxoCaixa[] = [{ mes: 0, entradas: 0, saidas: resultado.investimentoInicial, saldoMensal: -resultado.investimentoInicial, saldoAcumulado: -resultado.investimentoInicial }];
  for (let m = 1; m <= horizonte; m++) {
    const entradas = entradasPorMes[m] ?? 0;
    const saidas = saidasPorMes[m] ?? 0;
    const saldoMensal = entradas - saidas;
    const saldoAcumulado = meses[m - 1].saldoAcumulado + saldoMensal;
    meses.push({ mes: m, entradas, saidas, saldoMensal, saldoAcumulado });
  }

  let necessidadeMaximaCaixa = 0;
  let mesDeMaiorNecessidade: number | null = null;
  for (const linha of meses) {
    if (linha.saldoAcumulado < necessidadeMaximaCaixa) {
      necessidadeMaximaCaixa = linha.saldoAcumulado;
      mesDeMaiorNecessidade = linha.mes;
    }
  }

  return { meses, necessidadeMaximaCaixa: Math.abs(necessidadeMaximaCaixa), mesDeMaiorNecessidade };
}

/* ---------------------------------- Cenários ---------------------------------- */

export interface AjusteCenario {
  materiaisPercent: number;
  combustivelPercent: number;
  manutencaoPercent: number;
  lucroPercentPontos: number;
}

export interface LinhaCenario {
  nome: string;
  ajuste: AjusteCenario;
  resultado: ResultadoFormacaoPreco;
}

function multiplicarLinhaCusto(itens: LinhaCusto[], fator: number): LinhaCusto[] {
  return itens.map((i) => ({ ...i, valorUnitario: i.valorUnitario * fator }));
}

function aplicarAjusteCenario(f: RascunhoFormacaoPreco, ajuste: AjusteCenario): RascunhoFormacaoPreco {
  return {
    ...f,
    materiaisAplicacao: { itens: multiplicarLinhaCusto(f.materiaisAplicacao.itens, 1 + ajuste.materiaisPercent) },
    veiculos: {
      ...f.veiculos,
      itensManutencao: multiplicarLinhaCusto(f.veiculos.itensManutencao, 1 + ajuste.manutencaoPercent),
      itensCombustivel: f.veiculos.itensCombustivel.map((i) => ({ ...i, precoLitro: i.precoLitro * (1 + ajuste.combustivelPercent) })),
    },
    lucroPercent: Math.max(0, f.lucroPercent + ajuste.lucroPercentPontos),
  };
}

export const AJUSTE_BASE: AjusteCenario = { materiaisPercent: 0, combustivelPercent: 0, manutencaoPercent: 0, lucroPercentPontos: 0 };
export const AJUSTE_CONSERVADOR: AjusteCenario = { materiaisPercent: 0.1, combustivelPercent: 0.15, manutencaoPercent: 0.2, lucroPercentPontos: -0.02 };
export const AJUSTE_OTIMISTA: AjusteCenario = { materiaisPercent: -0.05, combustivelPercent: -0.1, manutencaoPercent: -0.1, lucroPercentPontos: 0.02 };

export function calcularCenarios(f: RascunhoFormacaoPreco, ajustes: { base: AjusteCenario; conservador: AjusteCenario; otimista: AjusteCenario }): LinhaCenario[] {
  return [
    { nome: 'Base', ajuste: ajustes.base, resultado: calcularResultado(aplicarAjusteCenario(f, ajustes.base)) },
    { nome: 'Conservador', ajuste: ajustes.conservador, resultado: calcularResultado(aplicarAjusteCenario(f, ajustes.conservador)) },
    { nome: 'Otimista', ajuste: ajustes.otimista, resultado: calcularResultado(aplicarAjusteCenario(f, ajustes.otimista)) },
  ];
}

/* ------------------------------ Sensibilidade ------------------------------ */

export interface PontoSensibilidade {
  variacaoPercent: number;
  custoTotal: number;
  preco: number | null;
  lucro: number;
  margemPercent: number | null;
}

export interface LinhaSensibilidade {
  categoria: string;
  pontos: PontoSensibilidade[];
}

function pontoSensibilidade(f: RascunhoFormacaoPreco, variacaoPercent: number, ajuste: Partial<AjusteCenario>): PontoSensibilidade {
  const r = calcularResultado(aplicarAjusteCenario(f, { ...AJUSTE_BASE, ...ajuste }));
  return {
    variacaoPercent,
    custoTotal: r.totalCustosComContingencia,
    preco: r.precoAdotado,
    lucro: r.lucroValor,
    margemPercent: r.precoAdotado ? (r.lucroValor / r.precoAdotado) * 100 : null,
  };
}

/** Materiais e combustível variam -10%/atual/+10%/+20%/+30%; manutenção corretiva -20%/atual/+20%/+40%/+60% (faixa maior por ser mais volátil). */
export function calcularMatrizSensibilidade(f: RascunhoFormacaoPreco): LinhaSensibilidade[] {
  const variacoesPadrao = [-0.1, 0, 0.1, 0.2, 0.3];
  const variacoesManutencao = [-0.2, 0, 0.2, 0.4, 0.6];

  return [
    { categoria: 'Materiais', pontos: variacoesPadrao.map((v) => pontoSensibilidade(f, v * 100, { materiaisPercent: v })) },
    { categoria: 'Combustível', pontos: variacoesPadrao.map((v) => pontoSensibilidade(f, v * 100, { combustivelPercent: v })) },
    { categoria: 'Manutenção corretiva', pontos: variacoesManutencao.map((v) => pontoSensibilidade(f, v * 100, { manutencaoPercent: v })) },
  ];
}

/* -------------------------------- Validações -------------------------------- */

export type StatusValidacao = 'ok' | 'atencao' | 'erro';

export interface ItemValidacao {
  status: StatusValidacao;
  mensagem: string;
}

export function calcularValidacoes(f: RascunhoFormacaoPreco, resultado: ResultadoFormacaoPreco): ItemValidacao[] {
  const itens: ItemValidacao[] = [];

  itens.push(f.nome.trim() ? { status: 'ok', mensagem: 'Nome da simulação preenchido' } : { status: 'erro', mensagem: 'Falta o nome da simulação' });
  itens.push(f.companyId ? { status: 'ok', mensagem: 'Empresa selecionada' } : { status: 'erro', mensagem: 'Falta selecionar a empresa' });

  const temMaoDeObra = f.maoDeObraDireta.itens.length > 0 || f.maoDeObraIndireta.itens.length > 0;
  itens.push(temMaoDeObra ? { status: 'ok', mensagem: 'Mão de obra preenchida' } : { status: 'atencao', mensagem: 'Nenhum cargo de mão de obra cadastrado' });

  const k = f.custosIndiretosPercent + f.lucroPercent + f.tributosSobreCustoPercent + f.tributosSobreReceitaPercent;
  if (k >= 1) {
    itens.push({ status: 'erro', mensagem: `Custos indiretos + lucro + tributos somam ${(k * 100).toFixed(1)}% (≥100%) — preço mínimo fica indefinido` });
  } else if (k >= 0.6) {
    itens.push({ status: 'atencao', mensagem: `Custos indiretos + lucro + tributos somam ${(k * 100).toFixed(1)}% do preço — faixa alta, confira os percentuais` });
  } else {
    itens.push({ status: 'ok', mensagem: `Custos indiretos + lucro + tributos somam ${(k * 100).toFixed(1)}% do preço` });
  }

  itens.push(
    resultado.lucroValor > 0
      ? { status: 'ok', mensagem: 'Margem de lucro positiva' }
      : { status: 'atencao', mensagem: 'Margem de lucro zerada — confira o percentual de lucro-alvo' },
  );

  if (f.tributos.itens.length > 0) {
    const somaAliquotas = f.tributos.itens.reduce((s, i) => s + i.aliquotaPercent, 0);
    const divergente = Math.abs(somaAliquotas - (f.tributosSobreCustoPercent + f.tributosSobreReceitaPercent) * 100) > 0.05;
    itens.push(
      divergente
        ? { status: 'atencao', mensagem: 'Soma dos tributos detalhados diverge do percentual de tributos usado no cálculo' }
        : { status: 'ok', mensagem: 'Tributos detalhados batem com o percentual usado no cálculo' },
    );
  }

  if (f.precoReferencia != null && f.precoReferencia > 0 && resultado.comparacaoReferencia) {
    itens.push(
      resultado.comparacaoReferencia.viavel
        ? { status: 'ok', mensagem: 'Preço de referência do edital cobre o preço mínimo' }
        : { status: 'erro', mensagem: 'Preço de referência do edital é menor que o preço mínimo calculado' },
    );
  }

  if (f.capitalGiro.prazoRecebimentoDias === 30 && f.capitalGiro.prazoPagamentoDias === 30) {
    itens.push({ status: 'atencao', mensagem: 'Prazos de recebimento/pagamento em 30/30 dias (default) — A CONFIRMAR com o financeiro' });
  }

  itens.push(
    resultado.investimentoInicial > 0 && resultado.roiTotalPercent !== null
      ? { status: 'ok', mensagem: 'ROI calculado a partir do investimento inicial' }
      : { status: 'atencao', mensagem: 'Sem investimento inicial identificado — ROI/payback não calculados' },
  );

  return itens;
}
