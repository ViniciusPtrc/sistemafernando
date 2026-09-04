import type { ContaReceber, StatusConta } from '@/types';

/**
 * Formato comum de um título "cru", já extraído da fonte (planilha ou dataset
 * inicial), mas ainda não convertido para o modelo `ContaReceber` usado pelo
 * resto do app. Isolar esse formato evita que os dois pontos de entrada de
 * dados reais (dataset embutido no build e importação de arquivo pelo usuário)
 * dupliquem a mesma lógica de conversão.
 */
export interface RegistroContaReceberOrigem {
  documento: string;
  codigoTitulo: string;
  banco: number | null;
  numeroConta: string;
  clienteNome: string;
  numeroContrato: string | null;
  situacaoCarteira: string | null;
  numeroBordo: number;
  emissao: string;
  valorBruto: number;
  vencimento: string;
  valorLiquido: number;
  dataPagamento: string | null;
  valorRecebido: number | null;
  temDesconto: boolean;
  recebido: boolean;
}

const CATEGORIA_LOCACAO_ID = 'cat-r-4';
const CATEGORIA_LOCACAO_NOME = 'Locação';

/**
 * Regra centralizada de status. O relatório de origem só distingue "baixado"
 * (Sta === 'B' / com data de pagamento) de "não baixado" — não existe recebimento
 * parcial por título nos dados reais, então não inventamos um status
 * "parcialmente_recebido" sem que a fonte sustente essa distinção.
 */
export function calcularStatusContaReceber(recebido: boolean, vencimento: string, hojeIso: string): StatusConta {
  if (recebido) return 'recebido';
  return vencimento < hojeIso ? 'vencido' : 'a_vencer';
}

export interface ContextoNormalizacaoContaReceber {
  id: string;
  companyId: string;
  clienteId: string;
  clienteNome: string;
  origem: ContaReceber['origem'];
  arquivoOrigem?: string;
  /** Data de referência (ISO) usada para decidir vencido x a vencer. Default: hoje. */
  hojeIso?: string;
}

export function normalizarContaReceber(
  registro: RegistroContaReceberOrigem,
  contexto: ContextoNormalizacaoContaReceber,
): ContaReceber {
  const hojeIso = contexto.hojeIso ?? new Date().toISOString().slice(0, 10);
  const status = calcularStatusContaReceber(registro.recebido, registro.vencimento, hojeIso);

  return {
    id: contexto.id,
    companyId: contexto.companyId,
    clienteId: contexto.clienteId,
    clienteNome: contexto.clienteNome,
    documento: registro.documento,
    descricao: 'Aluguel de Equipamentos',
    categoriaId: CATEGORIA_LOCACAO_ID,
    categoriaNome: CATEGORIA_LOCACAO_NOME,
    valor: registro.valorLiquido,
    vencimento: registro.vencimento,
    dataPagamento: registro.dataPagamento,
    status,
    formaPagamento: 'boleto',
    observacoes: registro.numeroContrato ? `Contrato nº ${registro.numeroContrato}` : undefined,
    criadoEm: registro.emissao,
    valorBruto: registro.valorBruto,
    valorRecebido: registro.valorRecebido,
    canalCobranca: registro.situacaoCarteira ?? undefined,
    numeroContrato: registro.numeroContrato ?? undefined,
    codigoTitulo: registro.codigoTitulo,
    origem: contexto.origem,
    arquivoOrigem: contexto.arquivoOrigem,
  };
}
