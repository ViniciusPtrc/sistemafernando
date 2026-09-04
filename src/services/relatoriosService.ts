import type { DefinicaoRelatorio } from '@/types';

/**
 * Catálogo de relatórios disponíveis — metadado de UI (título, descrição, grupo).
 * Os DADOS de cada relatório vêm de GET /api/reports/:tipo via reportService.
 */
export const relatoriosDisponiveis: DefinicaoRelatorio[] = [
  { tipo: 'contas_pagar', titulo: 'Relatório de Contas a Pagar', descricao: 'Consolidado de obrigações por fornecedor, categoria e status de pagamento.', grupo: 'geral' },
  { tipo: 'contas_receber', titulo: 'Relatório de Contas a Receber', descricao: 'Consolidado de recebimentos por cliente, categoria e status.', grupo: 'geral' },
  { tipo: 'inadimplencia', titulo: 'Relatório de Inadimplência', descricao: 'Títulos vencidos, aging e taxa de inadimplência do período.', grupo: 'geral' },
  { tipo: 'fluxo_caixa', titulo: 'Relatório de Fluxo de Caixa', descricao: 'Movimentação de entradas e saídas com saldo acumulado.', grupo: 'geral' },
  { tipo: 'por_cliente', titulo: 'Relatório por Cliente', descricao: 'Ranking e histórico de faturamento por cliente.', grupo: 'geral' },
  { tipo: 'por_fornecedor', titulo: 'Relatório por Fornecedor', descricao: 'Ranking e histórico de gastos por fornecedor.', grupo: 'geral' },
  { tipo: 'por_categoria', titulo: 'Relatório por Categoria', descricao: 'Distribuição de receitas e despesas por categoria financeira.', grupo: 'geral' },
  { tipo: 'resultado_financeiro', titulo: 'Resultado Financeiro', descricao: 'Receitas, despesas e resultado líquido consolidado do período.', grupo: 'geral' },
  { tipo: 'contas_pagar_por_empresa', titulo: 'Contas a Pagar — por Empresa', descricao: 'Comparativo de obrigações entre LOC TUDO, ALUGUE TUDO EVENTO e ALUGUE TUDO COMÉRCIO.', grupo: 'empresa' },
  { tipo: 'contas_receber_por_empresa', titulo: 'Contas a Receber — por Empresa', descricao: 'Comparativo de recebimentos entre as 3 empresas do grupo.', grupo: 'empresa' },
  { tipo: 'fluxo_caixa_por_empresa', titulo: 'Fluxo de Caixa — por Empresa', descricao: 'Entradas, saídas e saldo de cada empresa lado a lado.', grupo: 'empresa' },
  { tipo: 'inadimplencia_por_empresa', titulo: 'Inadimplência — por Empresa', descricao: 'Valores vencidos e taxa de inadimplência de cada empresa do grupo.', grupo: 'empresa' },
  { tipo: 'resultado_financeiro_por_empresa', titulo: 'Resultado Financeiro — por Empresa', descricao: 'Recebido, pago e resultado líquido individual de cada empresa.', grupo: 'empresa' },
];

export async function getRelatoriosDisponiveis(): Promise<DefinicaoRelatorio[]> {
  return Promise.resolve(relatoriosDisponiveis);
}
