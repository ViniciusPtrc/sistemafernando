import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDownCircle, ArrowUpCircle, PiggyBank, Wallet } from 'lucide-react';
import { clsx } from 'clsx';
import { PageHeader } from '@/components/ui/PageHeader';
import { ExportButton } from '@/components/ui/ExportButton';
import { Card } from '@/components/ui/Card';
import { CardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { ChartCard } from '@/components/ui/ChartCard';
import { CompanyAvatar } from '@/components/ui/CompanyAvatar';
import { DataTable, type DataTableColumn } from '@/components/tables/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { CompanyCashFlowCompareChart } from '@/components/dashboard/CompanyCashFlowCompareChart';
import {
  getFluxoCaixaComparativoEmpresas,
  getFluxoCaixaLancamentos,
  getFluxoCaixaPontos,
  getFluxoCaixaResumo,
} from '@/services/fluxoCaixaService';
import { useCompany } from '@/hooks/useCompany';
import { useToast } from '@/hooks/useToast';
import { ordenarLista, paginarLista } from '@/utils/listQuery';
import { exportarCsv } from '@/utils/export';
import { formatCurrency, formatDate } from '@/utils/format';
import type { FormatoExportacao, LancamentoFluxoCaixa, OrdenacaoState, PontoFluxoCaixa, ResumoFluxoCaixa } from '@/types';

const ITENS_POR_PAGINA = 10;

export default function FluxoCaixaPage() {
  const { notificar } = useToast();
  const { companies, selectedCompany, currentCompany, isConsolidated } = useCompany();
  const [resumo, setResumo] = useState<ResumoFluxoCaixa | null>(null);
  const [pontos, setPontos] = useState<PontoFluxoCaixa[]>([]);
  const [lancamentos, setLancamentos] = useState<LancamentoFluxoCaixa[]>([]);
  const [pontosComparativo, setPontosComparativo] = useState<Record<string, number | string>[]>([]);
  const [compararEmpresas, setCompararEmpresas] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [ordenacao, setOrdenacao] = useState<OrdenacaoState<keyof LancamentoFluxoCaixa & string>>({
    campo: 'data',
    direcao: 'desc',
  });

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(false);
    Promise.all([
      getFluxoCaixaResumo(selectedCompany),
      getFluxoCaixaPontos(selectedCompany),
      getFluxoCaixaLancamentos(selectedCompany),
      getFluxoCaixaComparativoEmpresas(),
    ])
      .then(([resumoResultado, pontosResultado, lancamentosResultado, comparativoResultado]) => {
        if (!ativo) return;
        setResumo(resumoResultado);
        setPontos(pontosResultado);
        setLancamentos(lancamentosResultado);
        setPontosComparativo(comparativoResultado);
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
  }, [selectedCompany, tentativa]);

  useEffect(() => {
    if (!isConsolidated) setCompararEmpresas(false);
  }, [isConsolidated]);

  const lancamentosOrdenados = useMemo(() => ordenarLista(lancamentos, ordenacao), [lancamentos, ordenacao]);
  const paginaAtual = useMemo(
    () => paginarLista(lancamentosOrdenados, { pagina, itensPorPagina: ITENS_POR_PAGINA }),
    [lancamentosOrdenados, pagina],
  );

  const nomeEmpresa = (companyId: string) => companies.find((c) => c.id === companyId)?.name ?? '—';

  const colunas: DataTableColumn<LancamentoFluxoCaixa>[] = [
    { chave: 'data', titulo: 'Data', ordenavel: true, render: (l) => formatDate(l.data) },
    ...(isConsolidated
      ? ([
          {
            chave: 'companyId',
            titulo: 'Empresa',
            render: (l: LancamentoFluxoCaixa) => {
              const empresa = companies.find((c) => c.id === l.companyId);
              return empresa ? (
                <div className="flex items-center gap-2">
                  <CompanyAvatar company={empresa} size="sm" />
                  <span className="text-xs font-medium text-graphite-600">{empresa.shortName}</span>
                </div>
              ) : (
                '—'
              );
            },
          },
        ] as DataTableColumn<LancamentoFluxoCaixa>[])
      : []),
    { chave: 'descricao', titulo: 'Descrição', ordenavel: true },
    {
      chave: 'tipo',
      titulo: 'Tipo',
      render: (l) => (
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
            l.tipo === 'entrada' ? 'text-positive-600' : 'text-negative-600'
          }`}
        >
          {l.tipo === 'entrada' ? <ArrowUpCircle className="h-3.5 w-3.5" /> : <ArrowDownCircle className="h-3.5 w-3.5" />}
          {l.tipo === 'entrada' ? 'Entrada' : 'Saída'}
        </span>
      ),
    },
    { chave: 'categoriaNome', titulo: 'Categoria' },
    {
      chave: 'entrada',
      titulo: 'Entrada',
      alinhamento: 'direita',
      render: (l) => (l.entrada > 0 ? <span className="font-medium text-positive-600">{formatCurrency(l.entrada)}</span> : '—'),
    },
    {
      chave: 'saida',
      titulo: 'Saída',
      alinhamento: 'direita',
      render: (l) => (l.saida > 0 ? <span className="font-medium text-negative-600">{formatCurrency(l.saida)}</span> : '—'),
    },
    {
      chave: 'saldo',
      titulo: 'Saldo',
      alinhamento: 'direita',
      render: (l) => <span className="font-semibold text-graphite-900">{formatCurrency(l.saldo)}</span>,
    },
  ];

  const exportar = (formato: FormatoExportacao) => {
    if (formato === 'csv') {
      exportarCsv(
        'fluxo-de-caixa',
        ['Data', 'Empresa', 'Descrição', 'Tipo', 'Categoria', 'Entrada', 'Saída', 'Saldo'],
        lancamentos.map((l) => [
          formatDate(l.data),
          nomeEmpresa(l.companyId),
          l.descricao,
          l.tipo === 'entrada' ? 'Entrada' : 'Saída',
          l.categoriaNome,
          l.entrada,
          l.saida,
          l.saldo,
        ]),
      );
      notificar({ titulo: 'Exportação concluída', descricao: 'Arquivo CSV baixado com sucesso.', variante: 'sucesso' });
      return;
    }
    notificar({
      titulo: 'Exportação em processamento',
      descricao: `O relatório em ${formato.toUpperCase()} será gerado pela API em produção.`,
      variante: 'info',
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Fluxo de Caixa"
        subtitulo={
          isConsolidated
            ? 'Acompanhe entradas, saídas e a movimentação de caixa das 3 empresas'
            : `Acompanhe entradas, saídas e a movimentação de caixa — ${currentCompany?.name}`
        }
        acoes={<ExportButton onExportar={exportar} />}
      />

      {erro ? (
        <ErrorState onTentarNovamente={() => setTentativa((t) => t + 1)} />
      ) : carregando || !resumo ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ResumoCard titulo="Saldo Inicial" valor={resumo.saldoInicial} icone={<Wallet className="h-5 w-5" />} tom="neutro" />
          <ResumoCard titulo="Entradas" valor={resumo.totalEntradas} icone={<ArrowUpCircle className="h-5 w-5" />} tom="positivo" />
          <ResumoCard titulo="Saídas" valor={resumo.totalSaidas} icone={<ArrowDownCircle className="h-5 w-5" />} tom="negativo" />
          <ResumoCard titulo="Saldo Final" valor={resumo.saldoFinal} icone={<PiggyBank className="h-5 w-5" />} tom="destaque" />
        </div>
      )}

      <ChartCard
        titulo="Movimentação de Caixa"
        subtitulo={compararEmpresas ? 'Saldo mensal de cada empresa' : 'Entradas e saídas ao longo do período'}
        acoes={
          isConsolidated && (
            <div className="flex rounded-lg border border-graphite-200 p-0.5">
              <button
                type="button"
                onClick={() => setCompararEmpresas(false)}
                className={clsx(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  !compararEmpresas ? 'bg-graphite-900 text-white' : 'text-graphite-500 hover:text-graphite-800',
                )}
              >
                Consolidado
              </button>
              <button
                type="button"
                onClick={() => setCompararEmpresas(true)}
                className={clsx(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  compararEmpresas ? 'bg-graphite-900 text-white' : 'text-graphite-500 hover:text-graphite-800',
                )}
              >
                Comparar empresas
              </button>
            </div>
          )
        }
      >
        {carregando ? (
          <ChartSkeleton />
        ) : compararEmpresas ? (
          <CompanyCashFlowCompareChart dados={pontosComparativo} empresas={companies} />
        ) : (
          <CashFlowChart dados={pontos} />
        )}
      </ChartCard>

      <Card>
        <DataTable
          colunas={colunas}
          dados={paginaAtual.dados}
          getId={(l) => l.id}
          carregando={carregando}
          ordenacao={ordenacao}
          onOrdenacaoChange={(novaOrdenacao) => {
            setOrdenacao(novaOrdenacao);
            setPagina(1);
          }}
        />
        <Pagination pagina={pagina} itensPorPagina={ITENS_POR_PAGINA} total={lancamentos.length} onPaginaChange={setPagina} />
      </Card>
    </div>
  );
}

function ResumoCard({
  titulo,
  valor,
  icone,
  tom,
}: {
  titulo: string;
  valor: number;
  icone: ReactNode;
  tom: 'neutro' | 'positivo' | 'negativo' | 'destaque';
}) {
  const TOM_CLASSES: Record<typeof tom, string> = {
    neutro: 'bg-graphite-100 text-graphite-600',
    positivo: 'bg-positive-50 text-positive-600',
    negativo: 'bg-negative-50 text-negative-600',
    destaque: 'bg-brand-50 text-brand-600',
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-graphite-500">{titulo}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${TOM_CLASSES[tom]}`}>{icone}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-graphite-900">{formatCurrency(valor)}</p>
    </Card>
  );
}
