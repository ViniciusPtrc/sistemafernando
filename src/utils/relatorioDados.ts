import type { TipoRelatorio } from '@/types';
import { companies } from '@/mock/companies';
import { contasPagarMock } from '@/mock/contasPagar';
import { contasReceberMock } from '@/mock/contasReceber';
import { categoriasDespesa, categoriasReceita } from '@/mock/categorias';
import { gerarLancamentos } from '@/mock/fluxoCaixa';
import { calculateCompanyMetrics } from './companyMetrics';
import { formatCurrency, formatDate, formatPercent } from './format';
import { STATUS_LABELS } from './status';

export interface TabelaRelatorio {
  colunas: string[];
  linhas: (string | number)[][];
}

function agruparPorEntidade<T extends { valor: number; status: string }>(
  contas: T[],
  nomeDe: (item: T) => string,
): { nome: string; valor: number; quantidade: number }[] {
  const mapa = new Map<string, { nome: string; valor: number; quantidade: number }>();
  for (const conta of contas) {
    if (conta.status === 'cancelado') continue;
    const nome = nomeDe(conta);
    const atual = mapa.get(nome) ?? { nome, valor: 0, quantidade: 0 };
    atual.valor += conta.valor;
    atual.quantidade += 1;
    mapa.set(nome, atual);
  }
  return Array.from(mapa.values()).sort((a, b) => b.valor - a.valor);
}

export function gerarTabelaRelatorio(tipo: TipoRelatorio): TabelaRelatorio {
  switch (tipo) {
    case 'contas_pagar':
      return {
        colunas: ['Fornecedor', 'Documento', 'Vencimento', 'Categoria', 'Valor', 'Status'],
        linhas: contasPagarMock
          .slice(0, 25)
          .map((c) => [c.fornecedorNome, c.documento, formatDate(c.vencimento), c.categoriaNome, formatCurrency(c.valor), STATUS_LABELS[c.status]]),
      };
    case 'contas_receber':
      return {
        colunas: ['Cliente', 'Documento', 'Vencimento', 'Categoria', 'Valor', 'Status'],
        linhas: contasReceberMock
          .slice(0, 25)
          .map((c) => [c.clienteNome, c.documento, formatDate(c.vencimento), c.categoriaNome, formatCurrency(c.valor), STATUS_LABELS[c.status]]),
      };
    case 'inadimplencia': {
      const vencidasReceber = contasReceberMock.filter((c) => c.status === 'vencido');
      const vencidasPagar = contasPagarMock.filter((c) => c.status === 'vencido');
      return {
        colunas: ['Tipo', 'Cliente/Fornecedor', 'Documento', 'Vencimento', 'Valor'],
        linhas: [
          ...vencidasReceber.map((c) => ['A Receber', c.clienteNome, c.documento, formatDate(c.vencimento), formatCurrency(c.valor)]),
          ...vencidasPagar.map((c) => ['A Pagar', c.fornecedorNome, c.documento, formatDate(c.vencimento), formatCurrency(c.valor)]),
        ].slice(0, 25),
      };
    }
    case 'fluxo_caixa':
      return {
        colunas: ['Data', 'Descrição', 'Tipo', 'Entrada', 'Saída', 'Saldo'],
        linhas: gerarLancamentos()
          .slice(0, 25)
          .map((l) => [
            formatDate(l.data),
            l.descricao,
            l.tipo === 'entrada' ? 'Entrada' : 'Saída',
            l.entrada > 0 ? formatCurrency(l.entrada) : '—',
            l.saida > 0 ? formatCurrency(l.saida) : '—',
            formatCurrency(l.saldo),
          ]),
      };
    case 'por_cliente':
      return {
        colunas: ['Cliente', 'Quantidade de Títulos', 'Valor Total'],
        linhas: agruparPorEntidade(contasReceberMock, (c) => c.clienteNome).map((item) => [
          item.nome,
          item.quantidade,
          formatCurrency(item.valor),
        ]),
      };
    case 'por_fornecedor':
      return {
        colunas: ['Fornecedor', 'Quantidade de Títulos', 'Valor Total'],
        linhas: agruparPorEntidade(contasPagarMock, (c) => c.fornecedorNome).map((item) => [
          item.nome,
          item.quantidade,
          formatCurrency(item.valor),
        ]),
      };
    case 'por_categoria': {
      const despesas = categoriasDespesa.map((categoria) => {
        const valor = contasPagarMock
          .filter((c) => c.categoriaId === categoria.id && c.status !== 'cancelado')
          .reduce((soma, c) => soma + c.valor, 0);
        return ['Despesa', categoria.nome, formatCurrency(valor)];
      });
      const receitas = categoriasReceita.map((categoria) => {
        const valor = contasReceberMock
          .filter((c) => c.categoriaId === categoria.id && c.status !== 'cancelado')
          .reduce((soma, c) => soma + c.valor, 0);
        return ['Receita', categoria.nome, formatCurrency(valor)];
      });
      return {
        colunas: ['Tipo', 'Categoria', 'Valor Total'],
        linhas: [...receitas, ...despesas],
      };
    }
    case 'resultado_financeiro': {
      const totalRecebido = contasReceberMock.filter((c) => c.status === 'recebido').reduce((s, c) => s + c.valor, 0);
      const totalPago = contasPagarMock.filter((c) => c.status === 'pago').reduce((s, c) => s + c.valor, 0);
      return {
        colunas: ['Indicador', 'Valor'],
        linhas: [
          ['Total Recebido', formatCurrency(totalRecebido)],
          ['Total Pago', formatCurrency(totalPago)],
          ['Resultado Líquido', formatCurrency(totalRecebido - totalPago)],
        ],
      };
    }
    case 'contas_pagar_por_empresa':
      return {
        colunas: ['Empresa', 'Quantidade', 'Pago', 'Em Aberto', 'Vencido', 'Total'],
        linhas: companies.map((empresa) => {
          const metrics = calculateCompanyMetrics(empresa.id);
          const doEmpresa = contasPagarMock.filter((c) => c.companyId === empresa.id && c.status !== 'cancelado');
          return [
            empresa.name,
            doEmpresa.length,
            formatCurrency(metrics.pago),
            formatCurrency(metrics.aPagar),
            formatCurrency(metrics.vencidoPagar),
            formatCurrency(metrics.pago + metrics.aPagar),
          ];
        }),
      };
    case 'contas_receber_por_empresa':
      return {
        colunas: ['Empresa', 'Quantidade', 'Recebido', 'Em Aberto', 'Vencido', 'Total'],
        linhas: companies.map((empresa) => {
          const metrics = calculateCompanyMetrics(empresa.id);
          const doEmpresa = contasReceberMock.filter((c) => c.companyId === empresa.id && c.status !== 'cancelado');
          return [
            empresa.name,
            doEmpresa.length,
            formatCurrency(metrics.recebido),
            formatCurrency(metrics.aReceber),
            formatCurrency(metrics.vencidoReceber),
            formatCurrency(metrics.recebido + metrics.aReceber),
          ];
        }),
      };
    case 'fluxo_caixa_por_empresa':
      return {
        colunas: ['Empresa', 'Entradas', 'Saídas', 'Saldo'],
        linhas: companies.map((empresa) => {
          const lancamentos = gerarLancamentos(empresa.id);
          const entradas = lancamentos.reduce((soma, l) => soma + l.entrada, 0);
          const saidas = lancamentos.reduce((soma, l) => soma + l.saida, 0);
          return [empresa.name, formatCurrency(entradas), formatCurrency(saidas), formatCurrency(entradas - saidas)];
        }),
      };
    case 'inadimplencia_por_empresa':
      return {
        colunas: ['Empresa', 'Vencido a Receber', 'Vencido a Pagar', 'Total Vencido', 'Taxa de Inadimplência'],
        linhas: companies.map((empresa) => {
          const metrics = calculateCompanyMetrics(empresa.id);
          return [
            empresa.name,
            formatCurrency(metrics.vencidoReceber),
            formatCurrency(metrics.vencidoPagar),
            formatCurrency(metrics.vencidoReceber + metrics.vencidoPagar),
            formatPercent(metrics.taxaInadimplencia),
          ];
        }),
      };
    case 'resultado_financeiro_por_empresa':
      return {
        colunas: ['Empresa', 'Recebido', 'Pago', 'Resultado Líquido'],
        linhas: companies.map((empresa) => {
          const metrics = calculateCompanyMetrics(empresa.id);
          return [empresa.name, formatCurrency(metrics.recebido), formatCurrency(metrics.pago), formatCurrency(metrics.recebido - metrics.pago)];
        }),
      };
    default:
      return { colunas: [], linhas: [] };
  }
}
