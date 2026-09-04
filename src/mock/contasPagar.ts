import type { ContaPagar, StatusConta } from '@/types';
import { addDays, amountBetween, intBetween, mulberry32, pickFrom } from '@/utils/random';
import { categoriasDespesa, formasPagamento } from './categorias';
import { companies } from './companies';
import { fornecedores } from './fornecedores';

const DESCRICOES = [
  'Compra de materiais e insumos',
  'Mensalidade de serviço contratado',
  'Fatura de telefonia e internet',
  'Conta de energia elétrica',
  'Honorários contábeis',
  'Licença de software corporativo',
  'Locação de veículos',
  'Serviços de manutenção predial',
  'Campanha de marketing digital',
  'Frete e transporte de mercadorias',
];

const VOLUME_POR_EMPRESA: Record<string, number> = {
  'loc-tudo': 86,
  'alugue-tudo-evento': 66,
  'alugue-tudo-comercio': 54,
};

const SEED_POR_EMPRESA: Record<string, number> = {
  'loc-tudo': 20260829,
  'alugue-tudo-evento': 20260907,
  'alugue-tudo-comercio': 20260921,
};

function definirStatus(
  random: () => number,
  vencimento: string,
  hoje: string,
): { status: StatusConta; dataPagamento: string | null } {
  const roll = random();
  if (vencimento > hoje) {
    if (roll < 0.1) {
      return { status: 'pago', dataPagamento: addDays(vencimento, -intBetween(random, 1, 10)) };
    }
    if (roll < 0.13) {
      return { status: 'cancelado', dataPagamento: null };
    }
    return { status: 'em_aberto', dataPagamento: null };
  }
  if (roll < 0.78) {
    return { status: 'pago', dataPagamento: addDays(vencimento, intBetween(random, 0, 5)) };
  }
  if (roll < 0.95) {
    return { status: 'vencido', dataPagamento: null };
  }
  return { status: 'cancelado', dataPagamento: null };
}

function gerar(): ContaPagar[] {
  const hoje = new Date().toISOString().slice(0, 10);
  const inicioJanela = addDays(hoje, -150);
  const contas: ContaPagar[] = [];
  let indiceGlobal = 0;

  for (const empresa of companies) {
    const random = mulberry32(SEED_POR_EMPRESA[empresa.id] ?? 20260829);
    const quantidade = VOLUME_POR_EMPRESA[empresa.id] ?? 60;

    for (let i = 0; i < quantidade; i++) {
      const fornecedor = pickFrom(random, fornecedores);
      const categoria = pickFrom(random, categoriasDespesa);
      const vencimento = addDays(inicioJanela, intBetween(random, 0, 210));
      const { status, dataPagamento } = definirStatus(random, vencimento, hoje);
      const valor = amountBetween(random, 280, 32000, 10);
      const criadoEm = addDays(vencimento, -intBetween(random, 10, 40));

      contas.push({
        id: `cp-${indiceGlobal + 1}`,
        companyId: empresa.id,
        fornecedorId: fornecedor.id,
        fornecedorNome: fornecedor.nome,
        documento: `NF-${20000 + indiceGlobal}`,
        descricao: pickFrom(random, DESCRICOES),
        categoriaId: categoria.id,
        categoriaNome: categoria.nome,
        valor,
        vencimento,
        dataPagamento,
        status,
        formaPagamento: pickFrom(random, formasPagamento),
        observacoes: random() < 0.12 ? 'Aguardando aprovação financeira para pagamento.' : undefined,
        criadoEm,
      });

      indiceGlobal++;
    }
  }

  return contas.sort((a, b) => (a.vencimento < b.vencimento ? 1 : -1));
}

export const contasPagarMock: ContaPagar[] = gerar();
