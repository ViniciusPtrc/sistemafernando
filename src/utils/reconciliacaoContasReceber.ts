import type { TotalizadoresRelatorio } from './excelContasReceberParser';

/**
 * Conferência entre os totais que o próprio relatório do ERP declara
 * (linha "Total Geral >>>>" e o contador "Registros Impressos:") e os totais
 * que nós calculamos a partir dos registros normalizados. Divergência aqui
 * é sinal de perda ou duplicação de dado durante a importação.
 */
export interface DivergenciaReconciliacao {
  campo: 'valorBruto' | 'valorLiquido' | 'valorRecebido' | 'quantidadeRegistros';
  esperado: number;
  obtido: number;
  diferenca: number;
}

export interface ResultadoReconciliacaoContasReceber {
  ok: boolean;
  arquivoOrigem: string;
  registrosImpressosRelatorio: number | null;
  registrosParseados: number;
  registrosComErro: number;
  totalGeralRelatorio: { bruto: number | null; liquido: number | null; recebido: number | null };
  totalCalculado: { bruto: number; liquido: number; recebido: number };
  divergencias: DivergenciaReconciliacao[];
}

/** Tolerância de ruído de ponto flutuante do próprio relatório (observado até R$0,07 em ~800 registros). */
const TOLERANCIA_REAIS = 0.5;

export function reconciliarImportacaoContasReceber(params: {
  arquivoOrigem: string;
  totalizadoresRelatorio: TotalizadoresRelatorio;
  registrosParseados: number;
  registrosComErro: number;
  totalCalculado: { bruto: number; liquido: number; recebido: number };
}): ResultadoReconciliacaoContasReceber {
  const { arquivoOrigem, totalizadoresRelatorio, registrosParseados, registrosComErro, totalCalculado } = params;
  const divergencias: DivergenciaReconciliacao[] = [];

  function checar(campo: DivergenciaReconciliacao['campo'], esperado: number | null, obtido: number) {
    if (esperado === null) return;
    const diferenca = Math.round((obtido - esperado) * 100) / 100;
    if (Math.abs(diferenca) > TOLERANCIA_REAIS) {
      divergencias.push({ campo, esperado, obtido, diferenca });
    }
  }

  checar('valorBruto', totalizadoresRelatorio.totalBruto, totalCalculado.bruto);
  checar('valorLiquido', totalizadoresRelatorio.totalLiquido, totalCalculado.liquido);
  checar('valorRecebido', totalizadoresRelatorio.totalRecebido, totalCalculado.recebido);

  if (totalizadoresRelatorio.registrosImpressos !== null) {
    const totalLinhasProcessadas = registrosParseados + registrosComErro;
    if (totalLinhasProcessadas !== totalizadoresRelatorio.registrosImpressos) {
      divergencias.push({
        campo: 'quantidadeRegistros',
        esperado: totalizadoresRelatorio.registrosImpressos,
        obtido: totalLinhasProcessadas,
        diferenca: totalLinhasProcessadas - totalizadoresRelatorio.registrosImpressos,
      });
    }
  }

  return {
    ok: divergencias.length === 0,
    arquivoOrigem,
    registrosImpressosRelatorio: totalizadoresRelatorio.registrosImpressos,
    registrosParseados,
    registrosComErro,
    totalGeralRelatorio: {
      bruto: totalizadoresRelatorio.totalBruto,
      liquido: totalizadoresRelatorio.totalLiquido,
      recebido: totalizadoresRelatorio.totalRecebido,
    },
    totalCalculado,
    divergencias,
  };
}
