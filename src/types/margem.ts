export type StatusContrato = 'ativo' | 'encerrado' | 'cancelado' | 'outro';

export interface Contrato {
  id: string;
  companyId: string;
  numero: string;
  clienteNome: string;
  clienteDocumento: string;
  valorContratadoCents: number;
  faturamentoMensalCents: number;
  dataInicio: string;
  dataFim: string | null;
  status: StatusContrato;
  observacoes: string;
}

export type OrigemCusto = 'manual' | 'payable';
export type TipoCusto = 'realizado' | 'projetado';
export type RecorrenciaCusto = 'once' | 'installment' | 'fixed';

export interface CustoContrato {
  id: string;
  contractId: string;
  origem: OrigemCusto;
  tipo: TipoCusto;
  payableId: string | null;
  descricao: string;
  categoria: string;
  categoriaNome: string;
  fornecedorNome: string;
  valor: number;
  data: string | null;
  recorrencia: RecorrenciaCusto;
  parcelas: number | null;
  recorrenciaFim: string | null;
  observacoes: string;
}

export interface ClassificacaoMargem {
  nivel: 'excelente' | 'boa' | 'atencao' | 'critica' | 'prejuizo' | 'indefinida';
  label: string;
}

export interface MargemResumo {
  period: string;
  range: { from: string | null; to: string | null };
  contratosNoEscopo: number;
  receita: number;
  custos: number;
  lucro: number;
  margemPct: number | null;
  receitaRecebida: number;
  receitaPendente: number;
  custosProjetados: number;
  lucroProjetado: number;
  margemProjetadaPct: number | null;
  classificacao: ClassificacaoMargem;
}

export interface MargemMensal {
  mes: string;
  chave: string;
  receita: number;
  custos: number;
  lucro: number;
  margemPct: number | null;
}

export interface MargemPorContrato {
  contractId: string;
  numero: string;
  clienteNome: string;
  status: StatusContrato;
  receita: number;
  custos: number;
  lucro: number;
  margemPct: number | null;
  classificacao: ClassificacaoMargem;
}

export interface ContratoMargemDetalhe {
  contrato: {
    id: string;
    numero: string;
    companyId: string;
    clienteNome: string;
    clienteDocumento: string;
    valorContratadoCents: number;
    faturamentoMensalCents: number;
    status: StatusContrato;
    dataInicio: string;
    dataFim: string | null;
    observacoes: string;
  };
  period: string;
  range: { from: string | null; to: string | null };
  receita: number;
  receitaRecebida: number;
  receitaPendente: number;
  receitaBase: 'vinculada' | 'faturamento_mensal';
  custosRealizados: number;
  custosProjetados: number;
  lucroAtual: number;
  lucroProjetado: number;
  margemAtualPct: number | null;
  margemProjetadaPct: number | null;
  classificacao: ClassificacaoMargem;
}

export interface ProjecaoMes {
  mes: string;
  chave: string;
  receita: number;
  custos: number;
  lucro: number;
  margemPct: number | null;
}

export interface ContratoProjecao {
  contrato: {
    id: string;
    numero: string;
    clienteNome: string;
    status: StatusContrato;
    dataFim: string | null;
  };
  meses: number;
  faturamentoMensalCents: number;
  range: { from: string; to: string };
  linha: ProjecaoMes[];
  totais: {
    receita: number;
    custos: number;
    lucro: number;
    margemPct: number | null;
    margemMediaPct: number | null;
    classificacao: ClassificacaoMargem;
  };
}

export interface ReceitaVinculavel {
  id: string;
  clienteNome: string;
  documento: string;
  vencimento: string | null;
  valor: number;
  status: string;
}

export interface PayableVinculavel {
  id: string;
  fornecedorNome: string;
  documento: string;
  categoriaNome: string;
  vencimento: string | null;
  valor: number;
  status: string;
}
