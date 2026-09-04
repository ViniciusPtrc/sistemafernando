import type { ContaReceber } from '@/types';
import contasReceberLocTudoJson from './data/contasReceberLocTudo.json';
import { clientesLocTudo } from './clientesLocTudo';
import { normalizarContaReceber, type RegistroContaReceberOrigem } from '@/utils/normalizarContaReceber';

const registros = contasReceberLocTudoJson as RegistroContaReceberOrigem[];

const clienteIdPorNome = new Map(clientesLocTudo.map((cliente) => [cliente.nome, cliente.id]));

const ARQUIVO_ORIGEM = 'CONTAS A RECEBER ANUAL.XLS';

function gerarContasReceberLocTudoReal(): ContaReceber[] {
  return registros.map((registro, indice) => {
    const clienteId = clienteIdPorNome.get(registro.clienteNome) ?? `cli-lt-desconhecido-${indice}`;

    return normalizarContaReceber(registro, {
      id: `cr-lt-${indice + 1}`,
      companyId: 'loc-tudo',
      clienteId,
      clienteNome: registro.clienteNome,
      origem: 'dataset_inicial',
      arquivoOrigem: ARQUIVO_ORIGEM,
    });
  });
}

export const contasReceberLocTudoReal: ContaReceber[] = gerarContasReceberLocTudoReal();
