import type { Cliente, ContaReceber } from '@/types';
import { normalizarContaReceber, type RegistroContaReceberOrigem } from '@/utils/normalizarContaReceber';

/**
 * Dataset real de contas a receber/clientes da LOC Tudo — dado confidencial,
 * não versionado (`.gitignore`). Import opcional via glob: em checkouts limpos
 * (CI/deploy) os arquivos não existem e as listas ficam vazias, sem quebrar o build.
 */
const contasReceberModules = import.meta.glob<{ default: RegistroContaReceberOrigem[] }>('./data/contasReceberLocTudo.json', { eager: true });
const registros = Object.values(contasReceberModules)[0]?.default ?? [];

const clientesLocTudoModules = import.meta.glob<{ clientesLocTudo: Cliente[] }>('./clientesLocTudo.ts', { eager: true });
const clientesLocTudo = Object.values(clientesLocTudoModules)[0]?.clientesLocTudo ?? [];

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
