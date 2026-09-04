import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  BadgeDollarSign,
  Building2,
  Scale,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Wallet2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DateFilter } from '@/components/ui/DateFilter';
import { ExportButton } from '@/components/ui/ExportButton';
import { ChartCard } from '@/components/ui/ChartCard';
import { Card } from '@/components/ui/Card';
import { CardSkeleton, ChartSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { FinancialCard } from '@/components/dashboard/FinancialCard';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { CategoryDonutChart } from '@/components/dashboard/CategoryDonutChart';
import { RankingList } from '@/components/dashboard/RankingList';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { CompanyComparisonTable } from '@/components/dashboard/CompanyComparisonTable';
import { CompanyComparisonChart } from '@/components/dashboard/CompanyComparisonChart';
import { CompanyRecebidoPagoChart } from '@/components/dashboard/CompanyRecebidoPagoChart';
import { CompanyShareChart } from '@/components/dashboard/CompanyShareChart';
import { CompanyAnalysisCards } from '@/components/dashboard/CompanyAnalysisCards';
import { CompanyRanking } from '@/components/dashboard/CompanyRanking';
import { getCompanyComparison, getDashboard, type ComparativoEmpresas } from '@/services/dashboardService';
import { useCompany } from '@/hooks/useCompany';
import { useToast } from '@/hooks/useToast';
import { calcularRangePreset } from '@/utils/periodo';
import { exportarCsv } from '@/utils/export';
import { formatCurrency, formatPercent } from '@/utils/format';
import type { DashboardFinanceiro, FormatoExportacao, PeriodoFiltro } from '@/types';

export default function DashboardPage() {
  const { notificar } = useToast();
  const { selectedCompany, currentCompany, isConsolidated } = useCompany();
  const [periodo, setPeriodo] = useState<PeriodoFiltro>({
    preset: 'este_mes',
    range: calcularRangePreset('este_mes'),
  });
  const [dados, setDados] = useState<DashboardFinanceiro | null>(null);
  const [comparativo, setComparativo] = useState<ComparativoEmpresas | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(false);
    Promise.all([
      getDashboard(selectedCompany, periodo),
      isConsolidated ? getCompanyComparison() : Promise.resolve(null),
    ])
      .then(([dashboardResultado, comparativoResultado]) => {
        if (!ativo) return;
        setDados(dashboardResultado);
        setComparativo(comparativoResultado);
        setCarregando(false);
      })
      .catch(() => {
        if (!ativo) return;
        setErro(true);
        setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [selectedCompany, periodo, isConsolidated, tentativa]);

  const exportarRelatorio = (formato: FormatoExportacao) => {
    if (!dados) return;
    if (formato === 'csv') {
      exportarCsv(
        'dashboard-financeiro',
        ['Indicador', 'Valor'],
        [
          ['Contas a Receber', formatCurrency(dados.contasReceber.valor)],
          ['Contas a Pagar', formatCurrency(dados.contasPagar.valor)],
          ['Recebido', formatCurrency(dados.totalRecebido)],
          ['Pago', formatCurrency(dados.totalPago)],
          ['Saldo Projetado', formatCurrency(dados.saldoProjetado)],
          ['Vencido a Receber', formatCurrency(dados.vencidoReceber.valor)],
          ['Vencido a Pagar', formatCurrency(dados.vencidoPagar.valor)],
          ['Ticket Médio', formatCurrency(dados.ticketMedio)],
        ],
      );
      notificar({ titulo: 'Exportação concluída', descricao: 'O arquivo CSV foi baixado com sucesso.', variante: 'sucesso' });
      return;
    }
    notificar({
      titulo: 'Exportação em processamento',
      descricao: `O relatório em ${formato.toUpperCase()} será gerado pela API em produção.`,
      variante: 'info',
    });
  };

  const titulo = isConsolidated ? 'Visão Consolidada' : `Financeiro — ${currentCompany?.name}`;
  const subtitulo = isConsolidated
    ? 'Visão financeira consolidada das 3 empresas'
    : `Indicadores financeiros de ${currentCompany?.name}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo={titulo}
        subtitulo={subtitulo}
        acoes={
          <>
            <DateFilter valor={periodo} onChange={setPeriodo} />
            <ExportButton onExportar={exportarRelatorio} label="Exportar Relatório" />
          </>
        }
      />

      {erro ? (
        <ErrorState onTentarNovamente={() => setTentativa((t) => t + 1)} />
      ) : carregando || !dados ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FinancialCard
              titulo="Contas a Receber"
              valor={formatCurrency(dados.contasReceber.valor)}
              icone={<Wallet2 className="h-5 w-5" />}
              tom="positivo"
              quantidade={dados.contasReceber.quantidade}
            />
            <FinancialCard
              titulo="Contas a Pagar"
              valor={formatCurrency(dados.contasPagar.valor)}
              icone={<Wallet className="h-5 w-5" />}
              tom="negativo"
              quantidade={dados.contasPagar.quantidade}
            />
            <FinancialCard
              titulo="Recebido"
              valor={formatCurrency(dados.totalRecebido)}
              icone={<TrendingUp className="h-5 w-5" />}
              tom="positivo"
            />
            <FinancialCard
              titulo="Pago"
              valor={formatCurrency(dados.totalPago)}
              icone={<TrendingDown className="h-5 w-5" />}
              tom="negativo"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FinancialCard
              titulo="Saldo Projetado"
              valor={formatCurrency(dados.saldoProjetado)}
              icone={<Scale className="h-5 w-5" />}
              tom={dados.saldoProjetado >= 0 ? 'destaque' : 'negativo'}
              linhaDetalhe="Receber − Pagar"
            />
            <FinancialCard
              titulo="Vencido a Receber"
              valor={formatCurrency(dados.vencidoReceber.valor)}
              icone={<AlertTriangle className="h-5 w-5" />}
              tom="negativo"
              quantidade={dados.vencidoReceber.quantidade}
              labelQuantidade="títulos"
            />
            <FinancialCard
              titulo="Vencido a Pagar"
              valor={formatCurrency(dados.vencidoPagar.valor)}
              icone={<AlertTriangle className="h-5 w-5" />}
              tom="negativo"
              quantidade={dados.vencidoPagar.quantidade}
              labelQuantidade="títulos"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <IndicadorCompacto label="Ticket Médio" valor={formatCurrency(dados.ticketMedio)} />
            <IndicadorCompacto label="Maior Cliente" valor={dados.maiorCliente.nome} secundario />
            <IndicadorCompacto label="Maior Fornecedor" valor={dados.maiorFornecedor.nome} secundario />
            <IndicadorCompacto label="Taxa de Inadimplência" valor={formatPercent(dados.taxaInadimplencia)} />
          </div>

          {isConsolidated && comparativo && (
            <>
              <Card className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-graphite-400" />
                  <h2 className="text-sm font-semibold text-graphite-900">Desempenho por Empresa</h2>
                </div>
                <CompanyComparisonTable empresas={comparativo.empresas} consolidado={comparativo.consolidado} />
              </Card>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <ChartCard titulo="Comparativo por Empresa" subtitulo="A Receber, A Pagar e Saldo">
                  <CompanyComparisonChart empresas={comparativo.empresas} />
                </ChartCard>
                <ChartCard titulo="Recebido x Pago" subtitulo="Comparação entre as empresas">
                  <CompanyRecebidoPagoChart empresas={comparativo.empresas} />
                </ChartCard>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ChartCard titulo="Participação no Contas a Receber">
                  <CompanyShareChart empresas={comparativo.empresas} metrica="aReceber" />
                </ChartCard>
                <ChartCard titulo="Participação no Contas a Pagar">
                  <CompanyShareChart empresas={comparativo.empresas} metrica="aPagar" />
                </ChartCard>
              </div>

              <div>
                <h2 className="mb-4 text-sm font-semibold text-graphite-900">Análise das Empresas</h2>
                <CompanyAnalysisCards empresas={comparativo.empresas} />
              </div>

              <Card className="p-5">
                <CompanyRanking />
              </Card>
            </>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <ChartCard titulo="Fluxo de Caixa" subtitulo="Recebimentos x Pagamentos por período">
                <CashFlowChart dados={dados.fluxoCaixa} />
              </ChartCard>
            </div>
            <Card className="p-5">
              <div className="mb-1 flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-graphite-400" />
                <h3 className="text-sm font-semibold text-graphite-900">Alertas Financeiros</h3>
              </div>
              <div className="mt-4">
                <AlertsPanel alertas={dados.alertas} />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-graphite-400" />
                <h3 className="text-sm font-semibold text-graphite-900">Top 5 Clientes</h3>
              </div>
              <RankingList itens={dados.topClientes} corBarra="#2563eb" />
            </Card>
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <BadgeDollarSign className="h-4 w-4 text-graphite-400" />
                <h3 className="text-sm font-semibold text-graphite-900">Top 5 Fornecedores</h3>
              </div>
              <RankingList itens={dados.topFornecedores} corBarra="#ef4444" />
            </Card>
            <ChartCard titulo="Categorias com Maior Despesa">
              <CategoryDonutChart dados={dados.categoriasDespesa} />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

function IndicadorCompacto({ label, valor, secundario }: { label: string; valor: string; secundario?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-graphite-500">{label}</p>
      <p
        className={`mt-1.5 truncate font-semibold text-graphite-900 ${secundario ? 'text-sm' : 'text-base'}`}
        title={valor}
      >
        {valor}
      </p>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-4 w-20" />
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <Skeleton className="h-4 w-40" />
        <div className="mt-4">
          <ChartSkeleton />
        </div>
      </Card>
    </div>
  );
}
