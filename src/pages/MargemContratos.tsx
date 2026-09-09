import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Percent, Plus, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DateFilter } from '@/components/ui/DateFilter';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChartCard } from '@/components/ui/ChartCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { DataTable, type DataTableColumn } from '@/components/tables/DataTable';
import { FinancialCard } from '@/components/dashboard/FinancialCard';
import { MarginEvolutionChart } from '@/components/margin/MarginEvolutionChart';
import { MarginBadge } from '@/components/margin/MarginBadge';
import { ContractFormModal } from '@/components/margin/ContractFormModal';
import { useCompany } from '@/hooks/useCompany';
import { getMargemResumo, getMargemMensal, getMargemPorContrato, getContratos, type OrdenacaoMargemContrato } from '@/services/marginService';
import { formatCurrency, formatPercent } from '@/utils/format';
import type { Contrato, MargemPorContrato, MargemResumo, MargemMensal, PeriodoFiltro, StatusContrato } from '@/types';
import { calcularRangePreset, PERIODO_LABELS } from '@/utils/periodo';

const PRESETS_MARGEM: PeriodoFiltro['preset'][] = [
  'ultimos_3_meses',
  'ultimos_6_meses',
  'ultimos_12_meses',
  'ultimos_24_meses',
  'ultimos_36_meses',
  'este_ano',
  'ano_anterior',
  'personalizado',
];

const STATUS_OPCOES: { value: StatusContrato; label: string }[] = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'encerrado', label: 'Encerrado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'outro', label: 'Outro' },
];

const ORDENACAO_OPCOES: { value: OrdenacaoMargemContrato; label: string }[] = [
  { value: 'margem', label: 'Maior margem' },
  { value: 'margem_asc', label: 'Menor margem' },
  { value: 'receita', label: 'Maior receita' },
  { value: 'receita_asc', label: 'Menor receita' },
  { value: 'custos', label: 'Maior custo' },
  { value: 'custos_asc', label: 'Menor custo' },
  { value: 'lucro', label: 'Maior lucro' },
  { value: 'lucro_asc', label: 'Menor lucro' },
];

export default function MargemContratosPage() {
  const navigate = useNavigate();
  const { companies, selectedCompany, setSelectedCompany } = useCompany();

  const [periodo, setPeriodo] = useState<PeriodoFiltro>({ preset: 'ultimos_12_meses', range: calcularRangePreset('ultimos_12_meses') });
  const [contractId, setContractId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setBuscaAplicada(busca.trim()), 350);
    return () => clearTimeout(t);
  }, [busca]);
  const [ordenacao, setOrdenacao] = useState<OrdenacaoMargemContrato>('margem');

  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [resumo, setResumo] = useState<MargemResumo | null>(null);
  const [mensal, setMensal] = useState<MargemMensal[]>([]);
  const [porContrato, setPorContrato] = useState<MargemPorContrato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [modalContratoAberto, setModalContratoAberto] = useState(false);

  const filtro = useMemo(
    () => ({
      period: periodo.preset,
      from: periodo.preset === 'personalizado' ? periodo.range.inicio : undefined,
      to: periodo.preset === 'personalizado' ? periodo.range.fim : undefined,
      companyId: selectedCompany,
      contractId: contractId || undefined,
      customerName: customerName || undefined,
      search: buscaAplicada || undefined,
      status: (status as StatusContrato) || undefined,
    }),
    [periodo, selectedCompany, contractId, customerName, buscaAplicada, status],
  );

  useEffect(() => {
    getContratos({ companyId: selectedCompany, limit: 200 })
      .then((r) => setContratos(r.dados))
      .catch(() => setContratos([]));
  }, [selectedCompany, tentativa]);

  useEffect(() => {
    setCarregando(true);
    setErro(false);
    Promise.all([getMargemResumo(filtro), getMargemMensal(filtro), getMargemPorContrato(filtro, ordenacao)])
      .then(([r, m, c]) => {
        setResumo(r);
        setMensal(m);
        setPorContrato(c);
        setCarregando(false);
      })
      .catch(() => {
        setErro(true);
        setCarregando(false);
      });
  }, [filtro, ordenacao, tentativa]);

  const clientesDisponiveis = useMemo(() => [...new Set(contratos.map((c) => c.clienteNome))].sort(), [contratos]);

  const colunas: DataTableColumn<MargemPorContrato>[] = [
    { chave: 'numero', titulo: 'Contrato', ordenavel: false },
    { chave: 'clienteNome', titulo: 'Cliente' },
    { chave: 'receita', titulo: 'Receita', alinhamento: 'direita', render: (c) => formatCurrency(c.receita) },
    { chave: 'custos', titulo: 'Custos', alinhamento: 'direita', render: (c) => formatCurrency(c.custos) },
    { chave: 'lucro', titulo: 'Lucro', alinhamento: 'direita', render: (c) => <span className="font-medium text-graphite-900">{formatCurrency(c.lucro)}</span> },
    {
      chave: 'margemPct',
      titulo: 'Margem',
      alinhamento: 'direita',
      render: (c) => (
        <div className="flex items-center justify-end gap-2">
          <span className="font-medium">{c.margemPct == null ? 'N/A' : formatPercent(c.margemPct)}</span>
          <MarginBadge classificacao={c.classificacao} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Margem de Contratos"
        subtitulo={`Período: ${periodo.preset === 'personalizado' ? `${periodo.range.inicio} — ${periodo.range.fim}` : PERIODO_LABELS[periodo.preset]}`}
        acoes={
          <>
            <DateFilter valor={periodo} onChange={setPeriodo} presets={PRESETS_MARGEM} />
            <Button icone={<Plus className="h-4 w-4" />} onClick={() => setModalContratoAberto(true)}>
              Novo contrato
            </Button>
          </>
        }
      />

      {erro && <ErrorState onTentarNovamente={() => setTentativa((t) => t + 1)} />}

      <Card>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="w-full sm:w-64">
            <Input
              type="search"
              placeholder="Buscar por nº do contrato ou cliente…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              placeholder="Todas as empresas"
              opcoes={companies.map((c) => ({ value: c.id, label: c.name }))}
              value={selectedCompany === 'all' ? '' : selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value || 'all')}
            />
          </div>
          <div className="w-full sm:w-52">
            <Select
              placeholder="Todos os contratos"
              opcoes={contratos.map((c) => ({ value: c.id, label: `${c.numero} — ${c.clienteNome}` }))}
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              placeholder="Todos os clientes"
              opcoes={clientesDisponiveis.map((n) => ({ value: n, label: n }))}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-40">
            <Select placeholder="Todos os status" opcoes={STATUS_OPCOES} value={status} onChange={(e) => setStatus(e.target.value)} />
          </div>
        </div>
      </Card>

      {resumo && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FinancialCard titulo="Receita" valor={formatCurrency(resumo.receita)} icone={<Wallet className="h-4 w-4" />} tom="destaque" />
          <FinancialCard titulo="Custos" valor={formatCurrency(resumo.custos)} icone={<TrendingDown className="h-4 w-4" />} tom="negativo" />
          <FinancialCard titulo="Lucro" valor={formatCurrency(resumo.lucro)} icone={<TrendingUp className="h-4 w-4" />} tom={resumo.lucro >= 0 ? 'positivo' : 'negativo'} />
          <FinancialCard
            titulo="Margem"
            valor={resumo.margemPct == null ? 'N/A' : formatPercent(resumo.margemPct)}
            icone={<Percent className="h-4 w-4" />}
            tom={resumo.margemPct != null && resumo.margemPct >= 20 ? 'positivo' : 'neutro'}
            linhaDetalhe={resumo.classificacao.label}
          />
          <FinancialCard titulo="Receita Recebida" valor={formatCurrency(resumo.receitaRecebida)} icone={<Wallet className="h-4 w-4" />} />
          <FinancialCard titulo="Receita Pendente" valor={formatCurrency(resumo.receitaPendente)} icone={<Wallet className="h-4 w-4" />} />
          <FinancialCard titulo="Custos Projetados" valor={formatCurrency(resumo.custosProjetados)} icone={<TrendingDown className="h-4 w-4" />} />
          <FinancialCard
            titulo="Margem Projetada"
            valor={resumo.margemProjetadaPct == null ? 'N/A' : formatPercent(resumo.margemProjetadaPct)}
            icone={<Percent className="h-4 w-4" />}
          />
        </div>
      )}

      <ChartCard titulo="Evolução da Rentabilidade" subtitulo="Receita, custos e margem mês a mês">
        {carregando ? <div className="h-[340px] animate-pulse rounded-lg bg-graphite-100" /> : <MarginEvolutionChart dados={mensal} />}
      </ChartCard>

      <Card>
        <div className="flex items-center justify-between border-b border-graphite-200 p-4">
          <h2 className="text-sm font-semibold text-graphite-900">Rentabilidade por Contrato</h2>
          <div className="w-56">
            <Select opcoes={ORDENACAO_OPCOES} value={ordenacao} onChange={(e) => setOrdenacao(e.target.value as OrdenacaoMargemContrato)} />
          </div>
        </div>
        <DataTable colunas={colunas} dados={porContrato} getId={(c) => c.contractId} carregando={carregando} onRowClick={(c) => navigate(`/margem-contratos/${c.contractId}`)} />
      </Card>

      <ContractFormModal
        aberto={modalContratoAberto}
        onFechar={() => setModalContratoAberto(false)}
        onSalvo={() => setTentativa((t) => t + 1)}
        companies={companies}
        companyIdPadrao={selectedCompany}
      />
    </div>
  );
}
