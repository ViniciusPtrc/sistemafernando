import type { ContaReceber, StatusConta } from '@/types';
import { addDays, amountBetween, intBetween, mulberry32, pickFrom } from '@/utils/random';
import { categoriasReceita, formasPagamento } from './categorias';
import { clientes } from './clientes';
import { companies } from './companies';
import { contasReceberLocTudoReal } from './contasReceberLocTudoReal';

const DESCRICOES = [
  'Venda de mercadorias - pedido',
  'Prestação de serviços mensais',
  'Consultoria financeira',
  'Locação de equipamentos',
  'Fornecimento de materiais',
  'Contrato de manutenção',
  'Serviços de implantação',
  'Venda à vista',
  'Parcela de contrato anual',
  'Licenciamento de software',
];

const VOLUME_POR_EMPRESA: Record<string, number> = {
  'alugue-tudo-evento': 92,
  'alugue-tudo-comercio': 76,
};

const SEED_POR_EMPRESA: Record<string, number> = {
  'alugue-tudo-evento': 20260901,
  'alugue-tudo-comercio': 20260915,
};

function definirStatus(
  random: () => number,
  vencimento: string,
  hoje: string,
): { status: StatusConta; dataPagamento: string | null } {
  const roll = random();
  if (vencimento > hoje) {
    if (roll < 0.12) {
      return { status: 'recebido', dataPagamento: addDays(vencimento, -intBetween(random, 1, 10)) };
    }
    if (roll < 0.15) {
      return { status: 'cancelado', dataPagamento: null };
    }
    return { status: 'a_vencer', dataPagamento: null };
  }
  if (roll < 0.72) {
    return { status: 'recebido', dataPagamento: addDays(vencimento, intBetween(random, 0, 8)) };
  }
  if (roll < 0.94) {
    return { status: 'vencido', dataPagamento: null };
  }
  return { status: 'cancelado', dataPagamento: null };
}

function gerarSinteticas(): ContaReceber[] {
  const hoje = new Date().toISOString().slice(0, 10);
  const inicioJanela = addDays(hoje, -150);
  const contas: ContaReceber[] = [];
  let indiceGlobal = 0;

  const clientesSinteticos = clientes.filter((c) => !c.id.startsWith('cli-lt-'));

  for (const empresa of companies) {
    const quantidade = VOLUME_POR_EMPRESA[empresa.id];
    if (!quantidade) continue;

    const random = mulberry32(SEED_POR_EMPRESA[empresa.id] ?? 20260828);

    for (let i = 0; i < quantidade; i++) {
      const cliente = pickFrom(random, clientesSinteticos);
      const categoria = pickFrom(random, categoriasReceita);
      const vencimento = addDays(inicioJanela, intBetween(random, 0, 210));
      const { status, dataPagamento } = definirStatus(random, vencimento, hoje);
      const valor = amountBetween(random, 320, 48000, 10);
      const criadoEm = addDays(vencimento, -intBetween(random, 15, 45));

      contas.push({
        id: `cr-${indiceGlobal + 1}`,
        companyId: empresa.id,
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        documento: `NF-${10000 + indiceGlobal}`,
        descricao: pickFrom(random, DESCRICOES),
        categoriaId: categoria.id,
        categoriaNome: categoria.nome,
        valor,
        vencimento,
        dataPagamento,
        status,
        formaPagamento: pickFrom(random, formasPagamento),
        observacoes: random() < 0.15 ? 'Cliente solicitou envio de nota fiscal por e-mail.' : undefined,
        criadoEm,
        valorBruto: valor,
        valorRecebido: status === 'recebido' ? valor : null,
        origem: 'sintetico',
      });

      indiceGlobal++;
    }
  }

  return contas;
}

const STORAGE_KEY = 'dashboard:contasReceberImportadas:v1';

function carregarOverrides(): Record<string, ContaReceber[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ContaReceber[]>) : {};
  } catch {
    return {};
  }
}

function persistirOverride(companyId: string, contas: ContaReceber[]): void {
  try {
    const overrides = carregarOverrides();
    overrides[companyId] = contas;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // localStorage indisponível (modo privado, quota excedida etc.) — segue só em memória.
  }
}

function montarBase(): ContaReceber[] {
  const overrides = carregarOverrides();
  const locTudo = overrides['loc-tudo'] ?? contasReceberLocTudoReal;
  const sinteticas = gerarSinteticas().filter((c) => !overrides[c.companyId]);
  const overridesDemaisEmpresas = Object.entries(overrides)
    .filter(([companyId]) => companyId !== 'loc-tudo')
    .flatMap(([, contas]) => contas);

  return [...locTudo, ...sinteticas, ...overridesDemaisEmpresas];
}

export const contasReceberMock: ContaReceber[] = montarBase().sort((a, b) =>
  a.vencimento < b.vencimento ? 1 : -1,
);

/**
 * Substitui todos os títulos de uma empresa pelos dados de uma importação real
 * (arquivo do usuário), mutando o array em memória — todo código que já leu
 * `contasReceberMock` continua com a mesma referência e enxerga os dados novos
 * na próxima leitura. Também persiste a substituição em localStorage para
 * sobreviver a um refresh da página.
 */
export function substituirContasReceberDaEmpresa(companyId: string, novasContas: ContaReceber[]): void {
  const mantidas = contasReceberMock.filter((c) => c.companyId !== companyId);
  contasReceberMock.length = 0;
  contasReceberMock.push(...mantidas, ...novasContas);
  contasReceberMock.sort((a, b) => (a.vencimento < b.vencimento ? 1 : -1));
  persistirOverride(companyId, novasContas);
}
