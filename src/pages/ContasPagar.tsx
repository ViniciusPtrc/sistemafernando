import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DateFilter } from '@/components/ui/DateFilter';
import { ExportButton } from '@/components/ui/ExportButton';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { CompanyAvatar } from '@/components/ui/CompanyAvatar';
import { DataTable, type DataTableColumn } from '@/components/tables/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ResumoContasBar } from '@/components/tables/ResumoContasBar';
import { ErrorState } from '@/components/ui/ErrorState';
import { AccountDetailModal, type DetalheConta } from '@/components/tables/AccountDetailModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  excluirContaPagar,
  getContasPagar,
  getResumoContasPagar,
  type ResumoContasPagar,
} from '@/services/contasPagarService';
import { getFornecedores, getCategorias } from '@/services/entidadesService';
import { useCompany } from '@/hooks/useCompany';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { rangePadraoListagem } from '@/utils/periodo';
import { exportarCsv } from '@/utils/export';
import { formatCurrency, formatDate } from '@/utils/format';
import { STATUS_LABELS, FORMA_PAGAMENTO_LABELS } from '@/utils/status';
import { ALL_COMPANIES } from '@/mock/companies';
import type {
  Categoria,
  ContaPagar,
  FiltroContasPagar,
  Fornecedor,
  FormatoExportacao,
  OrdenacaoState,
  PeriodoFiltro,
  StatusConta,
} from '@/types';

const STATUS_OPCOES = (Object.keys(STATUS_LABELS) as StatusConta[]).map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
}));

const FORMA_PAGAMENTO_OPCOES = Object.entries(FORMA_PAGAMENTO_LABELS).map(([value, label]) => ({ value, label }));

export default function ContasPagarPage() {
  const { notificar } = useToast();
  const { companies, selectedCompany, setSelectedCompany } = useCompany();

  const [busca, setBusca] = useState('');
  const buscaDebounced = useDebounce(busca, 300);
  const [fornecedorId, setFornecedorId] = useState('');
  const [status, setStatus] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [periodo, setPeriodo] = useState<PeriodoFiltro>({
    preset: 'personalizado',
    range: rangePadraoListagem(),
  });

  const [pagina, setPagina] = useState(1);
  const [ordenacao, setOrdenacao] = useState<OrdenacaoState<keyof ContaPagar & string>>({
    campo: 'vencimento',
    direcao: 'desc',
  });

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [total, setTotal] = useState(0);
  const [resumo, setResumo] = useState<ResumoContasPagar | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [contaSelecionada, setContaSelecionada] = useState<ContaPagar | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    getFornecedores().then(setFornecedores).catch(() => setFornecedores([]));
    getCategorias()
      .then((todas) => setCategorias(todas.filter((c) => c.tipo === 'despesa')))
      .catch(() => setCategorias([]));
  }, []);

  const filtro: FiltroContasPagar = useMemo(
    () => ({
      busca: buscaDebounced || undefined,
      companyId: selectedCompany === ALL_COMPANIES ? undefined : selectedCompany,
      fornecedorId: fornecedorId || undefined,
      status: (status as StatusConta) || undefined,
      categoriaId: categoriaId || undefined,
      formaPagamento: (formaPagamento || undefined) as FiltroContasPagar['formaPagamento'],
      vencimento: periodo.range,
    }),
    [buscaDebounced, selectedCompany, fornecedorId, status, categoriaId, formaPagamento, periodo],
  );

  useEffect(() => setPagina(1), [filtro]);

  useEffect(() => {
    setCarregando(true);
    setErro(false);
    getContasPagar({ filtro, ordenacao, paginacao: { pagina, itensPorPagina: 10 } })
      .then((resposta) => {
        setContas(resposta.dados);
        setTotal(resposta.total);
        setCarregando(false);
      })
      .catch(() => {
        setErro(true);
        setCarregando(false);
      });
  }, [filtro, ordenacao, pagina, tentativa]);

  useEffect(() => {
    getResumoContasPagar(filtro)
      .then(setResumo)
      .catch(() => setResumo(null));
  }, [filtro, tentativa]);

  const nomeEmpresa = (companyId: string) => companies.find((c) => c.id === companyId)?.name ?? '—';

  const colunas: DataTableColumn<ContaPagar>[] = [
    {
      chave: 'companyId',
      titulo: 'Empresa',
      render: (c) => {
        const empresa = companies.find((e) => e.id === c.companyId);
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
    { chave: 'fornecedorNome', titulo: 'Fornecedor', ordenavel: true },
    { chave: 'documento', titulo: 'Documento', ordenavel: true },
    { chave: 'vencimento', titulo: 'Vencimento', ordenavel: true, render: (c) => formatDate(c.vencimento) },
    { chave: 'categoriaNome', titulo: 'Categoria', ordenavel: true },
    {
      chave: 'valor',
      titulo: 'Valor',
      ordenavel: true,
      alinhamento: 'direita',
      render: (c) => <span className="font-medium text-graphite-900">{formatCurrency(c.valor)}</span>,
    },
    { chave: 'status', titulo: 'Status', render: (c) => <StatusBadge status={c.status} /> },
  ];

  const exportar = (formato: FormatoExportacao) => {
    if (formato === 'csv') {
      exportarCsv(
        'contas-a-pagar',
        ['Empresa', 'Fornecedor', 'Documento', 'Vencimento', 'Categoria', 'Valor', 'Status'],
        contas.map((c) => [
          nomeEmpresa(c.companyId),
          c.fornecedorNome,
          c.documento,
          formatDate(c.vencimento),
          c.categoriaNome,
          c.valor,
          STATUS_LABELS[c.status],
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

  const handleExcluir = async () => {
    if (!contaSelecionada) return;
    setExcluindo(true);
    try {
      await excluirContaPagar(contaSelecionada.id);
      notificar({
        titulo: 'Lançamento excluído',
        descricao: `${contaSelecionada.fornecedorNome} — ${contaSelecionada.documento}`,
        variante: 'sucesso',
      });
      setConfirmarExclusao(false);
      setContaSelecionada(null);
      setTentativa((t) => t + 1);
    } catch (e) {
      notificar({
        titulo: 'Não foi possível excluir',
        descricao: e instanceof Error ? e.message : 'Tente novamente.',
        variante: 'erro',
      });
    } finally {
      setExcluindo(false);
    }
  };

  const detalhe: DetalheConta | null = contaSelecionada
    ? {
        empresaNome: nomeEmpresa(contaSelecionada.companyId),
        entidadeLabel: 'Fornecedor',
        entidadeNome: contaSelecionada.fornecedorNome,
        documento: contaSelecionada.documento,
        descricao: contaSelecionada.descricao,
        categoriaNome: contaSelecionada.categoriaNome,
        valor: contaSelecionada.valor,
        vencimento: contaSelecionada.vencimento,
        dataPagamento: contaSelecionada.dataPagamento,
        status: contaSelecionada.status,
        formaPagamento: contaSelecionada.formaPagamento,
        observacoes: contaSelecionada.observacoes,
        criadoEm: contaSelecionada.criadoEm,
      }
    : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Contas a Pagar"
        subtitulo="Gerencie as obrigações e acompanhe pagamentos"
        acoes={
          <>
            <DateFilter valor={periodo} onChange={setPeriodo} />
            <ExportButton onExportar={exportar} />
          </>
        }
      />

      {erro && <ErrorState onTentarNovamente={() => setTentativa((t) => t + 1)} />}

      <ResumoContasBar
        total={resumo?.total ?? 0}
        pago={resumo?.pago ?? 0}
        emAberto={resumo?.emAberto ?? 0}
        vencido={resumo?.vencido ?? 0}
        carregando={!resumo}
        labelTotal="Total a Pagar"
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-graphite-200 p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="w-full sm:max-w-xs">
            <Input
              icone={<Search className="h-4 w-4" />}
              placeholder="Buscar por fornecedor ou documento..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              placeholder="Todas as empresas"
              opcoes={companies.map((c) => ({ value: c.id, label: c.name }))}
              value={selectedCompany === ALL_COMPANIES ? '' : selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value || ALL_COMPANIES)}
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              placeholder="Fornecedor"
              opcoes={fornecedores.map((f) => ({ value: f.id, label: f.nome }))}
              value={fornecedorId}
              onChange={(e) => setFornecedorId(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-40">
            <Select placeholder="Status" opcoes={STATUS_OPCOES} value={status} onChange={(e) => setStatus(e.target.value)} />
          </div>
          <div className="w-full sm:w-44">
            <Select
              placeholder="Categoria"
              opcoes={categorias.map((c) => ({ value: c.id, label: c.nome }))}
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              placeholder="Forma de pagamento"
              opcoes={FORMA_PAGAMENTO_OPCOES}
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
            />
          </div>
        </div>

        <DataTable
          colunas={colunas}
          dados={contas}
          getId={(c) => c.id}
          carregando={carregando}
          ordenacao={ordenacao}
          onOrdenacaoChange={setOrdenacao}
          onRowClick={setContaSelecionada}
        />

        <Pagination pagina={pagina} itensPorPagina={10} total={total} onPaginaChange={setPagina} />
      </Card>

      <AccountDetailModal
        aberto={contaSelecionada !== null}
        onFechar={() => setContaSelecionada(null)}
        conta={detalhe}
        onExcluir={() => setConfirmarExclusao(true)}
        excluindo={excluindo}
      />

      <ConfirmDialog
        aberto={confirmarExclusao}
        titulo="Excluir lançamento?"
        descricao={
          contaSelecionada
            ? `O título "${contaSelecionada.documento}" de ${contaSelecionada.fornecedorNome} será removido permanentemente. Se ele ainda constar na planilha de origem, uma nova importação vai recriá-lo.`
            : ''
        }
        textoConfirmar={excluindo ? 'Excluindo…' : 'Excluir'}
        perigo
        onConfirmar={handleExcluir}
        onCancelar={() => setConfirmarExclusao(false)}
      />
    </div>
  );
}
