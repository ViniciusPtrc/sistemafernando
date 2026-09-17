import { gerarIdLocal } from './idLocal';
import type {
  BlocoEquipamentos,
  BlocoMaoDeObra,
  BlocoVeiculos,
  LinhaAtivo,
  LinhaCombustivel,
  LinhaCusto,
  LinhaMaoDeObra,
  LinhaTributo,
  RascunhoFormacaoPreco,
  ResultadoBlocoAtivo,
  ResultadoBlocoMaoDeObra,
  ResultadoFormacaoPreco,
} from '@/types';

/**
 * Espelha `backend/src/services/priceFormation.service.ts::computeResultado` em
 * reais (float) para feedback instantâneo no editor. A versão que fica salva vem
 * do backend (em centavos); diferenças de arredondamento entre as duas são
 * irrelevantes para uma ferramenta de simulação.
 *
 * Estrutura e fórmulas espelham a planilha-modelo "Planilha de Custos e Formação de
 * Preços" (DFP), aba "REAL (2)", incluindo duas particularidades confirmadas também
 * na aba "REAL" (não é erro isolado — é como o modelo da empresa calcula, reproduzido
 * de propósito para bater com o valor já entregue ao órgão):
 * 1) O total de mão-de-obra soma direta + indireta + uniforme/EPI + alimentação, mas
 *    NÃO soma assistência médica, moradia e outros custos (despesas médicas de
 *    canteiro + subcontratações) — ficam rastreados/exibidos, fora do total.
 * 2) O subtotal de materiais/equipamentos/veículos soma, além desses três, só o
 *    PRIMEIRO item da lista de uniforme/EPI (referência fixa de célula na planilha
 *    original) — não o total da seção, que já entrou no total de mão-de-obra acima.
 *    Isso causa contagem duplicada do primeiro item de uniforme, de propósito.
 */

function itemLineTotal(i: LinhaCusto): number {
  return i.quantidade * i.vezesPorAno * i.valorUnitario;
}

function somaLinhaCusto(itens: LinhaCusto[]): number {
  return itens.reduce((s, i) => s + itemLineTotal(i), 0);
}

function somaAquisicao(itens: LinhaAtivo[]): number {
  return itens.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0);
}

function somaCombustivel(itens: LinhaCombustivel[]): number {
  return itens.reduce((s, i) => s + (i.quantidade * i.kmPorAno * i.precoLitro) / (i.kmPorLitro || 1), 0);
}

/** `jornadaIntegralHorasDia` é configurável por simulação — usada para ratear o salário-base pela dedicação parcial ao contrato. */
function somaLinhaMaoDeObra(itens: LinhaMaoDeObra[], jornadaIntegralHorasDia: number): number {
  return itens.reduce((s, i) => s + i.quantidade * i.meses * i.salarioMensal * (i.dedicacaoHorasDia / jornadaIntegralHorasDia), 0);
}

/** Cada adicional é uma linha em R$ separada sobre o subtotal, somada ao final — igual à planilha-modelo do DFP. */
function calcBlocoMaoDeObra(b: BlocoMaoDeObra, jornadaIntegralHorasDia: number): ResultadoBlocoMaoDeObra {
  const subtotal = somaLinhaMaoDeObra(b.itens, jornadaIntegralHorasDia);
  const encargosSociaisValor = subtotal * b.encargosSociaisPercent;
  const horaExtraValor = subtotal * b.horaExtraPercent;
  const periculosidadeValor = subtotal * b.periculosidadePercent;
  const outrosAdicionaisValor = subtotal * b.outrosAdicionaisPercent;
  const total = subtotal + encargosSociaisValor + horaExtraValor + periculosidadeValor + outrosAdicionaisValor;
  return { subtotal, encargosSociaisValor, horaExtraValor, periculosidadeValor, outrosAdicionaisValor, total };
}

/**
 * Depreciação = custo de aquisição × depreciacaoPercent (direto, ex.: 15%). Remuneração
 * de capital = custo de aquisição × taxa mensal × período (meses) — replica o DFP
 * oficial (ex.: 1%/mês × 12 meses = 12% ao ano), em vez de um percentual anual único.
 * São dois blocos separados (1.3.1/1.3.2 ou 1.4.1/1.4.2), igual à planilha.
 */
function calcBlocoAtivo(itens: LinhaAtivo[], depreciacaoPercent: number, capitalTaxaMensalPercent: number, capitalPeriodoMeses: number): ResultadoBlocoAtivo {
  const custoAquisicao = somaAquisicao(itens);
  const depreciacao = custoAquisicao * depreciacaoPercent;
  const valorResidual = custoAquisicao - depreciacao;
  const remuneracaoCapital = custoAquisicao * capitalTaxaMensalPercent * capitalPeriodoMeses;
  return { custoAquisicao, valorResidual, depreciacao, remuneracaoCapital, total: depreciacao + remuneracaoCapital };
}

export function calcularResultado(f: RascunhoFormacaoPreco): ResultadoFormacaoPreco {
  const jornadaIntegralHorasDia = f.jornadaIntegralHorasDia || 8;
  const direta = calcBlocoMaoDeObra(f.maoDeObraDireta, jornadaIntegralHorasDia);
  const indireta = calcBlocoMaoDeObra(f.maoDeObraIndireta, jornadaIntegralHorasDia);

  const assistenciaMedica = somaLinhaCusto(f.assistenciaMedica.itens);
  const despesaMoradia = somaLinhaCusto(f.despesaMoradia.itens);
  const uniformeEpi = somaLinhaCusto(f.uniformeEpi.itens);
  const alimentacao = somaLinhaCusto(f.alimentacao.itens);
  const outrosCustos = somaLinhaCusto(f.outrosCustosMaoDeObra.despesasMedicas.itens) + somaLinhaCusto(f.outrosCustosMaoDeObra.subcontratacoes.itens);

  /** Bug-compatível com a planilha-modelo (ver comentário no topo do arquivo): exclui assistência médica, moradia e outros custos. */
  const maoDeObraTotal = direta.total + indireta.total + uniformeEpi + alimentacao;

  const materiaisAplicacao = somaLinhaCusto(f.materiaisAplicacao.itens);
  const outrosMateriais = somaLinhaCusto(f.outrosMateriais.itens);
  const materiaisTotal = materiaisAplicacao + outrosMateriais;

  const equipamentos = calcBlocoAtivo(f.equipamentos.itens, f.equipamentos.depreciacaoPercent, f.equipamentos.capitalTaxaMensalPercent, f.equipamentos.capitalPeriodoMeses);

  const veiculosDepreciacao = calcBlocoAtivo(
    f.veiculos.itensDepreciacao,
    f.veiculos.depreciacaoPercent,
    f.veiculos.capitalTaxaMensalPercent,
    f.veiculos.capitalPeriodoMeses,
  );
  const veiculosManutencao = somaLinhaCusto(f.veiculos.itensManutencao);
  const veiculosCombustivel = somaCombustivel(f.veiculos.itensCombustivel);
  const veiculosTotal = veiculosDepreciacao.total + veiculosManutencao + veiculosCombustivel;

  /** Bug-compatível: só o primeiro item de uniforme/EPI "vaza" para o subtotal — ver comentário no topo do arquivo. */
  const primeiroItemUniforme = f.uniformeEpi.itens.length > 0 ? itemLineTotal(f.uniformeEpi.itens[0]) : 0;
  const subtotalMateriaisEquipamentos = veiculosTotal + equipamentos.total + materiaisTotal + primeiroItemUniforme;

  const totalCustosDiretos = maoDeObraTotal + subtotalMateriaisEquipamentos;

  const meses = f.mesesContrato || 12;

  /** % sobre os custos diretos, aplicado antes do gross-up — buffer para riscos operacionais. */
  const contingenciaValor = totalCustosDiretos * (f.contingenciaPercent ?? 0);

  /**
   * Capital de giro: baseado só nos custos que geram desembolso de caixa (mão de
   * obra, materiais, manutenção e combustível) — depreciação/remuneração de capital
   * são registros contábeis, não saída de caixa, então ficam de fora para evitar
   * circularidade com o próprio preço (administração/tributos dependem do preço).
   */
  const cg = f.capitalGiro;
  const custoCaixaAnual = maoDeObraTotal + materiaisTotal + veiculosManutencao + veiculosCombustivel;
  const custoCaixaMensal = custoCaixaAnual / meses;
  const prazoLiquidoDias = Math.max(0, cg.prazoRecebimentoDias - cg.prazoPagamentoDias);
  const capitalGiroNecessario = (custoCaixaMensal * prazoLiquidoDias) / 30;

  /** Custo financeiro = capital de giro necessário × taxa mensal × duração do contrato. */
  const custoFinanceiroValor = capitalGiroNecessario * cg.taxaFinanceiraMensalPercent * meses;

  const totalCustosComContingencia = totalCustosDiretos + contingenciaValor + custoFinanceiroValor;

  const tributosPercent = (f.tributosSobreCustoPercent ?? 0) + (f.tributosSobreReceitaPercent ?? 0);
  const k = f.custosIndiretosPercent + f.lucroPercent + tributosPercent;
  const precoMinimo = k < 1 ? totalCustosComContingencia / (1 - k) : null;
  const custosIndiretosValor = precoMinimo === null ? 0 : f.custosIndiretosPercent * precoMinimo;
  const lucroValor = precoMinimo === null ? 0 : f.lucroPercent * precoMinimo;
  const tributosSobreCustoValor = precoMinimo === null ? 0 : (f.tributosSobreCustoPercent ?? 0) * precoMinimo;
  const tributosSobreReceitaValor = precoMinimo === null ? 0 : (f.tributosSobreReceitaPercent ?? 0) * precoMinimo;
  const tributosValor = tributosSobreCustoValor + tributosSobreReceitaValor;

  /** Linhas "Total dos Custos" e "Total dos Custos + Lucro" da planilha-modelo. */
  const totalCustos = totalCustosComContingencia + custosIndiretosValor;
  const totalCustosMaisLucro = totalCustos + lucroValor;

  /** Mesma fórmula do preço mínimo, mas sem a parcela de lucro — preço em que o resultado econômico é zero. */
  const kEquilibrio = f.custosIndiretosPercent + tributosPercent;
  const precoEquilibrio = kEquilibrio < 1 ? totalCustosComContingencia / (1 - kEquilibrio) : null;

  /** Lucro sobre o custo total (diretos + contingência + financeiro + indiretos + tributos) — distinto da margem, que é sobre o preço. */
  const custoTotalSemLucro = totalCustosComContingencia + custosIndiretosValor + tributosValor;
  const markupPercent = precoMinimo !== null && custoTotalSemLucro > 0 ? (lucroValor / custoTotalSemLucro) * 100 : null;

  const valorMensal = precoMinimo === null ? null : precoMinimo / meses;
  const valorAnual = valorMensal === null ? null : valorMensal * 12;
  const valorPorUnidade = precoMinimo === null || !f.quantidadeUnidades ? null : precoMinimo / f.quantidadeUnidades;

  /** Investimento inicial = aquisição de equipamentos + veículos + capital de giro + outros investimentos declarados. */
  const investimentoInicial = equipamentos.custoAquisicao + veiculosDepreciacao.custoAquisicao + capitalGiroNecessario + (cg.outrosInvestimentosIniciais ?? 0);
  const roiTotalPercent = precoMinimo !== null && investimentoInicial > 0 ? (lucroValor / investimentoInicial) * 100 : null;
  const roiAnualPercent = roiTotalPercent === null ? null : roiTotalPercent / (meses / 12);
  const paybackMeses = precoMinimo !== null && lucroValor > 0 ? investimentoInicial / (lucroValor / meses) : null;

  const dre =
    precoMinimo === null
      ? []
      : [
          { label: 'Faturamento (preço total)', valor: precoMinimo },
          { label: '(-) Tributos', valor: -tributosValor },
          { label: '(-) Mão de obra', valor: -maoDeObraTotal },
          { label: '(-) Materiais', valor: -materiaisTotal },
          { label: '(-) Equipamentos', valor: -equipamentos.total },
          { label: '(-) Veículos', valor: -veiculosTotal },
          { label: '(-) Contingência/Risco', valor: -contingenciaValor },
          { label: '(-) Custo financeiro', valor: -custoFinanceiroValor },
          { label: '(-) Custos indiretos (administração)', valor: -custosIndiretosValor },
          { label: '(=) Lucro', valor: lucroValor },
        ].map((l) => ({ ...l, percentualDaReceita: precoMinimo > 0 ? (l.valor / precoMinimo) * 100 : 0 }));

  let comparacaoReferencia: ResultadoFormacaoPreco['comparacaoReferencia'] = null;
  if (f.precoReferencia != null && f.precoReferencia > 0) {
    const lucroReal = f.precoReferencia * (1 - f.custosIndiretosPercent - tributosPercent) - totalCustosComContingencia;
    comparacaoReferencia = {
      precoReferencia: f.precoReferencia,
      lucroReal,
      margemRealPct: (lucroReal / f.precoReferencia) * 100,
      viavel: precoMinimo !== null && f.precoReferencia >= precoMinimo,
      diferenca: precoMinimo === null ? null : f.precoReferencia - precoMinimo,
    };
  }

  /**
   * Conferência com o "Total dos Serviços" do DFP oficial: réplica exata da fórmula da
   * planilha-modelo (aba "REAL (2)", célula A214). O tributo sobre a receita é
   * calculado sobre a receita mensal INFORMADA × 12 (não sobre o preço mínimo acima),
   * de propósito — evita a circularidade que a própria planilha evita ao digitar esse
   * valor em vez de calculá-lo. Só é calculado quando `receitaMensalInformada` é preenchida.
   */
  let totalServicosDfp: number | null = null;
  let receitaAnualInformada: number | null = null;
  let resultadoContratoInformado: number | null = null;
  if (f.receitaMensalInformada != null && f.receitaMensalInformada > 0) {
    const kSemTributosReceita = f.custosIndiretosPercent + f.lucroPercent + (f.tributosSobreCustoPercent ?? 0);
    receitaAnualInformada = f.receitaMensalInformada * 12;
    if (kSemTributosReceita < 1) {
      const custoComGrossUp = totalCustosComContingencia / (1 - kSemTributosReceita);
      const tributoSobreReceitaValor = (f.tributosSobreReceitaPercent ?? 0) * receitaAnualInformada;
      totalServicosDfp = custoComGrossUp + tributoSobreReceitaValor;
      resultadoContratoInformado = receitaAnualInformada - totalServicosDfp;
    }
  }

  return {
    maoDeObra: { direta, indireta, assistenciaMedica, despesaMoradia, uniformeEpi, alimentacao, outrosCustos, total: maoDeObraTotal },
    materiais: { aplicacao: materiaisAplicacao, outros: outrosMateriais, total: materiaisTotal },
    equipamentos,
    veiculos: { depreciacao: veiculosDepreciacao, manutencao: veiculosManutencao, combustivel: veiculosCombustivel, total: veiculosTotal },
    totalCustosDiretos,
    totalCustos,
    custosIndiretosValor,
    lucroValor,
    totalCustosMaisLucro,
    tributosValor,
    tributosSobreCustoValor,
    tributosSobreReceitaValor,
    precoMinimo,
    precoEquilibrio,
    markupPercent,
    valorMensal,
    valorAnual,
    valorPorUnidade,
    contingenciaValor,
    custoFinanceiroValor,
    totalCustosComContingencia,
    capitalGiroNecessario,
    investimentoInicial,
    roiTotalPercent,
    roiAnualPercent,
    paybackMeses,
    dre,
    comparacaoReferencia,
    totalServicosDfp,
    receitaAnualInformada,
    resultadoContratoInformado,
  };
}

export function novaLinhaCusto(vezesPorAno = 12): LinhaCusto {
  return { id: gerarIdLocal(), descricao: '', quantidade: 1, vezesPorAno, valorUnitario: 0 };
}

export function novaLinhaAtivo(): LinhaAtivo {
  return { id: gerarIdLocal(), descricao: '', quantidade: 1, valorUnitario: 0 };
}

export function novaLinhaMaoDeObra(jornadaIntegralHorasDia = 8): LinhaMaoDeObra {
  return { id: gerarIdLocal(), descricao: '', quantidade: 1, meses: 12, dedicacaoHorasDia: jornadaIntegralHorasDia, salarioMensal: 0 };
}

export function novaLinhaTributo(): LinhaTributo {
  return { id: gerarIdLocal(), nome: '', aliquotaPercent: 0, observacao: '' };
}

export function novaLinhaCombustivel(): LinhaCombustivel {
  return { id: gerarIdLocal(), descricao: '', quantidade: 1, kmPorAno: 0, kmPorLitro: 10, precoLitro: 0 };
}

export function formacaoPrecoVazia(companyId: string): RascunhoFormacaoPreco {
  const blocoMaoDeObra = (): BlocoMaoDeObra => ({ itens: [], encargosSociaisPercent: 0.6566, horaExtraPercent: 0, periculosidadePercent: 0, outrosAdicionaisPercent: 0 });
  const blocoEquipamentos = (): BlocoEquipamentos => ({ itens: [], depreciacaoPercent: 0.15, capitalTaxaMensalPercent: 0.01, capitalPeriodoMeses: 12 });
  const blocoVeiculos = (): BlocoVeiculos => ({
    itensDepreciacao: [],
    depreciacaoPercent: 0.3,
    capitalTaxaMensalPercent: 0.01,
    capitalPeriodoMeses: 12,
    itensManutencao: [],
    itensCombustivel: [],
  });
  return {
    companyId,
    nome: '',
    orgao: '',
    objeto: '',
    numeroPregao: '',
    regimeTributario: '',
    observacoes: '',
    maoDeObraDireta: blocoMaoDeObra(),
    maoDeObraIndireta: blocoMaoDeObra(),
    assistenciaMedica: { itens: [] },
    despesaMoradia: { itens: [] },
    uniformeEpi: { itens: [] },
    alimentacao: { itens: [] },
    outrosCustosMaoDeObra: { despesasMedicas: { itens: [] }, subcontratacoes: { itens: [] } },
    materiaisAplicacao: { itens: [] },
    outrosMateriais: { itens: [] },
    equipamentos: blocoEquipamentos(),
    veiculos: blocoVeiculos(),
    mesesContrato: 12,
    jornadaIntegralHorasDia: 8,
    quantidadeUnidades: null,
    tributos: { itens: [] },
    contingenciaPercent: 0,
    capitalGiro: { prazoRecebimentoDias: 30, prazoPagamentoDias: 30, taxaFinanceiraMensalPercent: 0, outrosInvestimentosIniciais: 0 },
    custosIndiretosPercent: 0.03,
    lucroPercent: 0,
    tributosSobreCustoPercent: 0,
    tributosSobreReceitaPercent: 0.1453,
    receitaMensalInformada: null,
    precoReferencia: null,
  };
}
