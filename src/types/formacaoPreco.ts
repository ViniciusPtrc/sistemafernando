export type RegimeTributario = 'simples' | 'presumido' | 'real' | '';

export interface LinhaCusto {
  id: string;
  descricao: string;
  quantidade: number;
  vezesPorAno: number;
  valorUnitario: number;
}

/**
 * `salarioMensal` é o salário-base de tempo integral (jornada de 8h/dia).
 * `dedicacaoHorasDia` rateia esse valor proporcionalmente à jornada — 4h/dia = 50%
 * do salário-base entra no custo do contrato.
 */
export interface LinhaMaoDeObra {
  id: string;
  descricao: string;
  quantidade: number;
  meses: number;
  dedicacaoHorasDia: number;
  salarioMensal: number;
}

export interface LinhaTributo {
  id: string;
  nome: string;
  aliquotaPercent: number;
  observacao: string;
}

export interface LinhaAtivo {
  id: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

export interface LinhaCombustivel {
  id: string;
  descricao: string;
  quantidade: number;
  kmPorAno: number;
  kmPorLitro: number;
  precoLitro: number;
}

export interface BlocoMaoDeObra {
  itens: LinhaMaoDeObra[];
  encargosSociaisPercent: number;
  horaExtraPercent: number;
  periculosidadePercent: number;
  outrosAdicionaisPercent: number;
}

export interface BlocoItens {
  itens: LinhaCusto[];
}

/**
 * 1.3.1 Depreciação (`depreciacaoPercent` direto sobre o custo de aquisição) e 1.3.2
 * Remuneração de capital (`capitalTaxaMensalPercent` × `capitalPeriodoMeses`) — dois
 * blocos separados, igual ao DFP oficial.
 */
export interface BlocoEquipamentos {
  itens: LinhaAtivo[];
  depreciacaoPercent: number;
  capitalTaxaMensalPercent: number;
  capitalPeriodoMeses: number;
}

export interface BlocoVeiculos {
  itensDepreciacao: LinhaAtivo[];
  depreciacaoPercent: number;
  capitalTaxaMensalPercent: number;
  capitalPeriodoMeses: number;
  itensManutencao: LinhaCusto[];
  itensCombustivel: LinhaCombustivel[];
}

/** Despesas médicas de canteiro + subcontratações — rastreadas, fora do total de mão-de-obra (ver `calcularResultado`). */
export interface BlocoOutrosCustosMaoDeObra {
  despesasMedicas: BlocoItens;
  subcontratacoes: BlocoItens;
}

export interface ResultadoBlocoMaoDeObra {
  subtotal: number;
  /** Valor em R$ de cada adicional sobre o subtotal — mesma decomposição em linhas da planilha-modelo do DFP. */
  encargosSociaisValor: number;
  horaExtraValor: number;
  periculosidadeValor: number;
  outrosAdicionaisValor: number;
  total: number;
}

export interface ResultadoBlocoAtivo {
  custoAquisicao: number;
  valorResidual: number;
  depreciacao: number;
  remuneracaoCapital: number;
  total: number;
}

export interface LinhaDre {
  label: string;
  valor: number;
  percentualDaReceita: number;
}

export interface ComparacaoReferencia {
  precoReferencia: number;
  lucroReal: number;
  margemRealPct: number;
  viavel: boolean;
  diferenca: number | null;
}

/** Prazos e taxa usados para capital de giro/custo financeiro — defaults neutros (prazos iguais = capital de giro zero). */
export interface CapitalGiro {
  prazoRecebimentoDias: number;
  prazoPagamentoDias: number;
  taxaFinanceiraMensalPercent: number;
  outrosInvestimentosIniciais: number;
}

export interface ResultadoFormacaoPreco {
  maoDeObra: {
    direta: ResultadoBlocoMaoDeObra;
    indireta: ResultadoBlocoMaoDeObra;
    /** Rastreada, mas fora de `total` (bug-compatível com a planilha-modelo — ver `calcularResultado`). */
    assistenciaMedica: number;
    /** Rastreada, mas fora de `total` (bug-compatível com a planilha-modelo — ver `calcularResultado`). */
    despesaMoradia: number;
    uniformeEpi: number;
    alimentacao: number;
    /** Despesas médicas de canteiro + subcontratações — rastreadas, mas fora de `total`. */
    outrosCustos: number;
    total: number;
  };
  materiais: { aplicacao: number; outros: number; total: number };
  equipamentos: ResultadoBlocoAtivo;
  veiculos: { depreciacao: ResultadoBlocoAtivo; manutencao: number; combustivel: number; total: number };
  totalCustosDiretos: number;
  /** Total dos Custos Diretos + Custos Indiretos (linha "Total dos Custos" da planilha-modelo). */
  totalCustos: number;
  custosIndiretosValor: number;
  /**
   * Lucro real (residual): preço adotado − tributos − indiretos − custos. Quando não há
   * `receitaMensalInformada`, isso coincide algebricamente com `lucroPercent × precoMinimo`
   * (o preço mínimo é resolvido exatamente para satisfazer essa margem-alvo).
   */
  lucroValor: number;
  /** Total dos Custos + Lucro (linha da planilha-modelo, base para os tributos "sobre o custo"). */
  totalCustosMaisLucro: number;
  /** Tributos sobre o custo (ex.: Simples Nacional) + tributos sobre a receita (ISS+PIS+COFINS+CPRB…). */
  tributosValor: number;
  tributosSobreCustoValor: number;
  tributosSobreReceitaValor: number;
  /** Preço mínimo teórico para bater a margem-alvo (lucroPercent), via gross-up — não usado quando o contrato já está fechado (ver `contratoFechado`). */
  precoMinimo: number | null;
  /** Preço em que o resultado econômico é zero (mesma fórmula, sem a parcela de lucro). */
  precoEquilibrio: number | null;
  /** true quando `receitaMensalInformada` foi preenchida: o contrato já está fechado, então lucro/margem/ROI/DRE usam o preço real, não uma meta. */
  contratoFechado: boolean;
  /** Preço efetivamente usado para lucro/margem/ROI/DRE/valor mensal: `receitaMensalInformada × mesesContrato` quando o contrato está fechado, senão `precoMinimo`. */
  precoAdotado: number | null;
  /** Lucro sobre o custo total (custos diretos + indiretos + tributos) — não confundir com a margem sobre o preço. */
  markupPercent: number | null;
  /** Valor mensal do contrato = preço adotado ÷ meses do contrato (= receita informada, quando o contrato está fechado). */
  valorMensal: number | null;
  /** Valor anual do contrato = valor mensal × 12. */
  valorAnual: number | null;
  /** Valor mensal × duração real do contrato (`mesesContrato`) — total do contrato inteiro, independente do DRE (que é sempre do ano 1). */
  valorGlobalContrato: number | null;
  /** Preço adotado ÷ quantidade de unidades/equipamentos, quando informada. */
  valorPorUnidade: number | null;
  /** Valor do buffer de contingência (% sobre custos diretos), aplicado antes do gross-up. */
  contingenciaValor: number;
  /** Valor do custo financeiro sobre o capital de giro necessário. */
  custoFinanceiroValor: number;
  /** Custos diretos + contingência + custo financeiro — base efetiva para o gross-up do preço. */
  totalCustosComContingencia: number;
  /** Capital de giro necessário, baseado nos custos operacionais que geram desembolso de caixa. */
  capitalGiroNecessario: number;
  /** Equipamentos + veículos (aquisição) + capital de giro + outros investimentos declarados. */
  investimentoInicial: number;
  /** Lucro total do contrato ÷ investimento inicial. */
  roiTotalPercent: number | null;
  /** ROI anualizado (roiTotalPercent ÷ (mesesContrato/12)). */
  roiAnualPercent: number | null;
  /** Meses até o investimento inicial se pagar com o lucro mensal. */
  paybackMeses: number | null;
  dre: LinhaDre[];
  comparacaoReferencia: ComparacaoReferencia | null;
  /**
   * Conferência com o "Total dos Serviços" do DFP oficial (baseada na fórmula da
   * planilha-modelo, escalada para o período inteiro do contrato — `mesesContrato`, não
   * só o ano 1) — só calculado quando `receitaMensalInformada` é preenchida.
   */
  totalServicosDfp: number | null;
  /** Receita do contrato inteiro (`receitaMensalInformada × mesesContrato`), apesar do nome — ver comentário acima. */
  receitaAnualInformada: number | null;
  resultadoContratoInformado: number | null;
}

export interface FormacaoPreco {
  id: string;
  companyId: string;
  nome: string;
  orgao: string;
  objeto: string;
  numeroPregao: string;
  regimeTributario: RegimeTributario;
  observacoes: string;

  maoDeObraDireta: BlocoMaoDeObra;
  maoDeObraIndireta: BlocoMaoDeObra;
  /** 1.1.3 Assistência médica — rastreada, fora do total de mão-de-obra (ver `calcularResultado`). */
  assistenciaMedica: BlocoItens;
  /** 1.1.4 Despesa moradia — rastreada, fora do total de mão-de-obra (ver `calcularResultado`). */
  despesaMoradia: BlocoItens;
  /** Uniforme e EPI — entra no total de mão-de-obra. */
  uniformeEpi: BlocoItens;
  /** Alimentação — entra no total de mão-de-obra. */
  alimentacao: BlocoItens;
  /** 1.1.7 Outros custos relacionados com mão-de-obra — rastreados, fora do total de mão-de-obra. */
  outrosCustosMaoDeObra: BlocoOutrosCustosMaoDeObra;

  /** 1.2.1 Materiais de aplicação (consumo recorrente do serviço). */
  materiaisAplicacao: BlocoItens;
  /** 1.2.2 Outros materiais — normalmente um valor fechado vindo de cotação externa. */
  outrosMateriais: BlocoItens;
  equipamentos: BlocoEquipamentos;
  veiculos: BlocoVeiculos;

  /** Duração do contrato em meses — usada para derivar valor mensal/anual. */
  mesesContrato: number;
  /** Jornada integral de referência (h/dia) usada para ratear o salário-base pela dedicação parcial ao contrato. */
  jornadaIntegralHorasDia: number;
  /** Quantidade de itens/equipamentos atendidos, opcional — usada para o valor por unidade. */
  quantidadeUnidades: number | null;

  /** Composição documentada dos tributos (ISS/PIS/COFINS/CPRB…) — não substitui os percentuais abaixo, é auditoria/rastreabilidade. */
  tributos: { itens: LinhaTributo[] };

  /** % sobre custos diretos, aplicado antes do gross-up — buffer para riscos operacionais. */
  contingenciaPercent: number;
  capitalGiro: CapitalGiro;

  custosIndiretosPercent: number;
  lucroPercent: number;
  /** Tributos incidentes sobre o CUSTO (ex.: Simples Nacional) — mesmo gross-up de indiretos/lucro. */
  tributosSobreCustoPercent: number;
  /** Tributos incidentes sobre a RECEITA (ISS+PIS+COFINS+CPRB…) — mesmo gross-up de indiretos/lucro. */
  tributosSobreReceitaPercent: number;
  /**
   * Receita mensal já negociada/informada (opcional) — usada só na conferência com o
   * "Total dos Serviços" do DFP oficial (`resultado.totalServicosDfp`).
   */
  receitaMensalInformada: number | null;
  precoReferencia: number | null;

  criadoEm: string | null;
  atualizadoEm: string | null;
  resultado: ResultadoFormacaoPreco;
}

/** Payload editável no formulário — mesma forma de FormacaoPreco, sem os campos calculados/servidor. */
export type RascunhoFormacaoPreco = Omit<FormacaoPreco, 'id' | 'criadoEm' | 'atualizadoEm' | 'resultado'>;
