import type { ContaReceber } from '@/types';
import { obterOuCriarCliente } from '@/mock/clientes';
import { normalizarContaReceber } from './normalizarContaReceber';
import { parseContasReceberXls, type ErroLinhaImportacao } from './excelContasReceberParser';
import { calcularResumoContasReceber } from './calculoContasReceber';
import { reconciliarImportacaoContasReceber, type ResultadoReconciliacaoContasReceber } from './reconciliacaoContasReceber';

export interface ResultadoImportacaoContasReceber {
  contas: ContaReceber[];
  erros: ErroLinhaImportacao[];
  reconciliacao: ResultadoReconciliacaoContasReceber;
}

export async function importarContasReceberDeArquivo(
  arquivo: File,
  companyId: string,
): Promise<ResultadoImportacaoContasReceber> {
  const { registros, erros, totalizadoresRelatorio } = await parseContasReceberXls(arquivo);

  const contas: ContaReceber[] = registros.map((registro, indice) => {
    const cliente = obterOuCriarCliente(registro.clienteNome);

    return normalizarContaReceber(registro, {
      id: `cr-imp-${companyId}-${indice + 1}`,
      companyId,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      origem: 'importacao_excel',
      arquivoOrigem: arquivo.name,
    });
  });

  const totalCalculado = calcularResumoContasReceber(contas, { incluirCancelados: true });
  const reconciliacao = reconciliarImportacaoContasReceber({
    arquivoOrigem: arquivo.name,
    totalizadoresRelatorio,
    registrosParseados: contas.length,
    registrosComErro: erros.length,
    totalCalculado: {
      bruto: totalCalculado.totalBruto,
      liquido: totalCalculado.totalLiquido,
      recebido: totalCalculado.recebido,
    },
  });

  if (!reconciliacao.ok) {
    console.warn('[importarContasReceberDeArquivo] Divergência encontrada na reconciliação:', reconciliacao);
  }

  return { contas, erros, reconciliacao };
}
