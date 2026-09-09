import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Link2, Percent, Plus, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DateFilter } from '@/components/ui/DateFilter';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChartCard } from '@/components/ui/ChartCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type DataTableColumn } from '@/components/tables/DataTable';
import { FinancialCard } from '@/components/dashboard/FinancialCard';
import { MarginEvolutionChart } from '@/components/margin/MarginEvolutionChart';
import { MarginBadge } from '@/components/margin/MarginBadge';
import { ContractFormModal } from '@/components/margin/ContractFormModal';
import { AddCostModal } from '@/components/margin/AddCostModal';
import { LinkExistingModal } from '@/components/margin/LinkExistingModal';
import { Select } from '@/components/ui/Select';
import { useCompany } from '@/hooks/useCompany';
import { useToast } from '@/hooks/useToast';
import {
  getContratoMargem,
  getContratoMargemMensal,
  getContratoProjecao,
  getCustosContrato,
  getReceitasVinculaveis,
  getPayablesVinculaveis,
  vincularReceitas,
  vincularCustos,
  excluirCusto,
} from '@/services/marginService';
import { formatCurrency, formatDate, formatPercent } from '@/utils/format';
import { calcularRangePreset } from '@/utils/periodo';
import type { Contrato, ContratoMargemDetalhe, ContratoProjecao, CustoContrato, MargemMensal, PeriodoFiltro, ProjecaoMes, ReceitaVinculavel, PayableVinculavel, RecorrenciaCusto, TipoCusto } from '@/types';

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

const ORIGEM_LABEL: Record<CustoContrato['origem'], string> = { manual: 'Manual', payable: 'Contas a Pagar' };
const TIPO_LABEL: Record<TipoCusto, string> = { realizado: 'Realizado', projetado: 'Projetado' };
const RECORRENCIA_LABEL: Record<RecorrenciaCusto, string> = { once: 'Único', installment: 'Parcelado', fixed: 'Fixo mensal' };

function descricaoRecorrencia(c: CustoContrato): string {
  if (c.recorrencia === 'installment') return `Parcelado ${c.parcelas ?? '?'}x`;
  if (c.recorrencia === 'fixed') return c.recorrenciaFim ? `Fixo até ${formatDate(c.recorrenciaFim)}` : 'Fixo mensal';
  return RECORRENCIA_LABEL.once;
}

export default function ContratoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notificar } = useToast();
  const { companies } = useCompany();

  const [periodo, setPeriodo] = useState<PeriodoFiltro>({ preset: 'ultimos_12_meses', range: calcularRangePreset('ultimos_12_meses') });
  const [detalhe, setDetalhe] = useState<ContratoMargemDetalhe | null>(null);
  const [mensal, setMensal] = useState<MargemMensal[]>([]);
  const [projecao, setProjecao] = useState<ContratoProjecao | null>(null);
  const [custos, setCustos] = useState<CustoContrato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [modalCustoAberto, setModalCustoAberto] = useState(false);
  const [modalVincularCustoAberto, setModalVincularCustoAberto] = useState(false);
  const [modalVincularReceitaAberto, setModalVincularReceitaAberto] = useState(false);
  const [tipoVinculo, setTipoVinculo] = useState<TipoCusto>('realizado');

  const filtro = useMemo(
    () => ({
      period: periodo.preset,
      from: periodo.preset === 'personalizado' ? periodo.range.inicio : undefined,
      to: periodo.preset === 'personalizado' ? periodo.range.fim : undefined,
    }),
    [periodo],
  );

  useEffect(() => {
    if (!id) return;
    setCarregando(true);
    setErro(false);
    Promise.all([getContratoMargem(id, filtro), getContratoMargemMensal(id, filtro), getCustosContrato(id), getContratoProjecao(id, 36)])
      .then(([d, m, c, p]) => {
        setDetalhe(d);
        setMensal(m);
        setCustos(c);
        setProjecao(p);
        setCarregando(false);
      })
      .catch(() => {
        setErro(true);
        setCarregando(false);
      });
  }, [id, filtro, tentativa]);

  const contratoParaEdicao: Contrato | null = detalhe
    ? {
        id: detalhe.contrato.id,
        companyId: detalhe.contrato.companyId,
        numero: detalhe.contrato.numero,
        clienteNome: detalhe.contrato.clienteNome,
        clienteDocumento: detalhe.contrato.clienteDocumento,
        valorContratadoCents: detalhe.contrato.valorContratadoCents,
        faturamentoMensalCents: detalhe.contrato.faturamentoMensalCents,
        dataInicio: detalhe.contrato.dataInicio,
        dataFim: detalhe.contrato.dataFim,
        status: detalhe.contrato.status,
        observacoes: detalhe.contrato.observacoes,
      }
    : null;

  const excluir = async (custo: CustoContrato) => {
    if (custo.origem === 'payable') {
      notificar({ titulo: 'Custo vinculado', descricao: 'Para remover, use "Desvincular" — edite o lançamento original em Contas a Pagar se precisar alterar o valor.', variante: 'info' });
      return;
    }
    if (!id) return;
    try {
      await excluirCusto(id, custo.id);
      setCustos((atual) => atual.filter((c) => c.id !== custo.id));
      setTentativa((t) => t + 1);
      notificar({ titulo: 'Custo removido', descricao: custo.descricao, variante: 'sucesso' });
    } catch (e) {
      notificar({ titulo: 'Não foi possível remover', descricao: e instanceof Error ? e.message : 'Tente novamente.', variante: 'erro' });
    }
  };

  const colunasCustos: DataTableColumn<CustoContrato>[] = [
    { chave: 'descricao', titulo: 'Descrição' },
    { chave: 'categoriaNome', titulo: 'Categoria' },
    { chave: 'fornecedorNome', titulo: 'Fornecedor' },
    { chave: 'data', titulo: 'Data', render: (c) => formatDate(c.data) },
    { chave: 'valor', titulo: 'Valor', alinhamento: 'direita', render: (c) => formatCurrency(c.valor) },
    { chave: 'origem', titulo: 'Origem', render: (c) => ORIGEM_LABEL[c.origem] },
    { chave: 'tipo', titulo: 'Tipo', render: (c) => TIPO_LABEL[c.tipo] },
    { chave: 'recorrencia', titulo: 'Recorrência', render: (c) => descricaoRecorrencia(c) },
    {
      chave: 'id',
      titulo: '',
      render: (c) => (
        <button type="button" onClick={() => excluir(c)} className="text-xs font-medium text-negative-600 hover:underline">
          Remover
        </button>
      ),
    },
  ];

  const colunasProjecao: DataTableColumn<ProjecaoMes>[] = [
    { chave: 'mes', titulo: 'Mês' },
    { chave: 'receita', titulo: 'Receita', alinhamento: 'direita', render: (m) => formatCurrency(m.receita) },
    { chave: 'custos', titulo: 'Custos', alinhamento: 'direita', render: (m) => formatCurrency(m.custos) },
    { chave: 'lucro', titulo: 'Lucro', alinhamento: 'direita', render: (m) => <span className="font-medium text-graphite-900">{formatCurrency(m.lucro)}</span> },
    { chave: 'margemPct', titulo: 'Margem', alinhamento: 'direita', render: (m) => (m.margemPct == null ? 'N/A' : formatPercent(m.margemPct)) },
  ];

  const semFaturamento = !!projecao && projecao.faturamentoMensalCents <= 0;

  if (erro) return <ErrorState onTentarNovamente={() => setTentativa((t) => t + 1)} />;
  if (!carregando && !detalhe) return <EmptyState titulo="Contrato não encontrado" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/margem-contratos')} className="flex h-8 w-8 items-center justify-center rounded-md text-graphite-400 hover:bg-graphite-100 hover:text-graphite-600" aria-label="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <PageHeader
          titulo={detalhe ? `Contrato ${detalhe.contrato.numero}` : 'Carregando…'}
          subtitulo={detalhe ? `${detalhe.contrato.clienteNome} · Valor contratado: ${formatCurrency(detalhe.contrato.valorContratadoCents / 100)}` : undefined}
          acoes={
            <>
              <DateFilter valor={periodo} onChange={setPeriodo} presets={PRESETS_MARGEM} />
              <Button variante="secundario" onClick={() => setModalEditarAberto(true)}>Editar contrato</Button>
            </>
          }
        />
      </div>

      {detalhe && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FinancialCard
            titulo="Receita no período"
            valor={formatCurrency(detalhe.receita)}
            icone={<Wallet className="h-4 w-4" />}
            tom="destaque"
            linhaDetalhe={detalhe.receitaBase === 'faturamento_mensal' ? 'base: faturamento mensal' : 'base: contas a receber vinculadas'}
          />
          <FinancialCard titulo="Custos no período" valor={formatCurrency(detalhe.custosRealizados)} icone={<TrendingDown className="h-4 w-4" />} tom="negativo" />
          <FinancialCard titulo="Lucro no período" valor={formatCurrency(detalhe.lucroAtual)} icone={<TrendingUp className="h-4 w-4" />} tom={detalhe.lucroAtual >= 0 ? 'positivo' : 'negativo'} />
          <FinancialCard
            titulo="Margem no período"
            valor={detalhe.margemAtualPct == null ? 'N/A' : formatPercent(detalhe.margemAtualPct)}
            icone={<Percent className="h-4 w-4" />}
            linhaDetalhe={detalhe.classificacao.label}
          />
          <FinancialCard titulo="Receita Recebida" valor={formatCurrency(detalhe.receitaRecebida)} icone={<Wallet className="h-4 w-4" />} />
          <FinancialCard titulo="Receita Pendente" valor={formatCurrency(detalhe.receitaPendente)} icone={<Wallet className="h-4 w-4" />} />
          <FinancialCard titulo="Custos Projetados (36m)" valor={formatCurrency(detalhe.custosProjetados)} icone={<TrendingDown className="h-4 w-4" />} />
          <FinancialCard titulo="Margem Projetada (36m)" valor={detalhe.margemProjetadaPct == null ? 'N/A' : formatPercent(detalhe.margemProjetadaPct)} icone={<Percent className="h-4 w-4" />} />
        </div>
      )}

      {detalhe && (
        <div className="flex items-center gap-2 text-sm text-graphite-600">
          Classificação de margem: <MarginBadge classificacao={detalhe.classificacao} />
        </div>
      )}

      <ChartCard titulo="Evolução do Contrato" subtitulo="Receita, custos e margem mês a mês (período selecionado)">
        {carregando ? <div className="h-[340px] animate-pulse rounded-lg bg-graphite-100" /> : <MarginEvolutionChart dados={mensal} />}
      </ChartCard>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-graphite-200 p-4">
          <div>
            <h2 className="text-sm font-semibold text-graphite-900">Projeção — próximos {projecao?.meses ?? 36} meses</h2>
            <p className="text-xs text-graphite-500">
              Faturamento mensal fixo de {formatCurrency((projecao?.faturamentoMensalCents ?? 0) / 100)} × custos lançados no contrato. A margem muda sozinha quando um parcelamento termina.
            </p>
          </div>
          <Button variante="secundario" onClick={() => setModalEditarAberto(true)}>Ajustar faturamento</Button>
        </div>

        {semFaturamento ? (
          <div className="p-6 text-sm text-graphite-500">
            Defina o <strong>faturamento mensal</strong> do contrato (botão “Ajustar faturamento” ou “Editar contrato”) para ver a projeção de margem.
          </div>
        ) : (
          <>
            {projecao && (
              <div className="grid grid-cols-2 gap-4 p-4 xl:grid-cols-4">
                <FinancialCard titulo={`Receita ${projecao.meses}m`} valor={formatCurrency(projecao.totais.receita)} icone={<Wallet className="h-4 w-4" />} tom="destaque" />
                <FinancialCard titulo={`Custos ${projecao.meses}m`} valor={formatCurrency(projecao.totais.custos)} icone={<TrendingDown className="h-4 w-4" />} tom="negativo" />
                <FinancialCard titulo={`Lucro ${projecao.meses}m`} valor={formatCurrency(projecao.totais.lucro)} icone={<TrendingUp className="h-4 w-4" />} tom={projecao.totais.lucro >= 0 ? 'positivo' : 'negativo'} />
                <FinancialCard
                  titulo="Margem média"
                  valor={projecao.totais.margemPct == null ? 'N/A' : formatPercent(projecao.totais.margemPct)}
                  icone={<Percent className="h-4 w-4" />}
                  linhaDetalhe={projecao.totais.classificacao.label}
                />
              </div>
            )}

            <div className="px-4 pb-2">
              {carregando ? <div className="h-[340px] animate-pulse rounded-lg bg-graphite-100" /> : <MarginEvolutionChart dados={projecao?.linha ?? []} />}
            </div>

            <DataTable colunas={colunasProjecao} dados={projecao?.linha ?? []} getId={(m) => m.chave} carregando={carregando} />
          </>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-graphite-200 p-4">
          <h2 className="text-sm font-semibold text-graphite-900">Custos</h2>
          <div className="flex gap-2">
            <Button variante="secundario" icone={<Link2 className="h-4 w-4" />} onClick={() => setModalVincularCustoAberto(true)}>
              Vincular custo existente
            </Button>
            <Button icone={<Plus className="h-4 w-4" />} onClick={() => setModalCustoAberto(true)}>
              Adicionar custo
            </Button>
          </div>
        </div>
        <DataTable colunas={colunasCustos} dados={custos} getId={(c) => c.id} carregando={carregando} />
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-graphite-200 p-4">
          <h2 className="text-sm font-semibold text-graphite-900">Receitas vinculadas</h2>
          <Button variante="secundario" icone={<Link2 className="h-4 w-4" />} onClick={() => setModalVincularReceitaAberto(true)}>
            Vincular receita existente
          </Button>
        </div>
        <div className="p-4 text-xs text-graphite-500">
          {detalhe ? `${formatCurrency(detalhe.receita)} em receitas vinculadas a este contrato no período selecionado.` : '—'}
        </div>
      </Card>

      {id && (
        <>
          <AddCostModal
            aberto={modalCustoAberto}
            onFechar={() => setModalCustoAberto(false)}
            contractId={id}
            onCriado={(c) => {
              setCustos((atual) => [c, ...atual]);
              setTentativa((t) => t + 1);
            }}
          />

          <LinkExistingModal<PayableVinculavel>
            aberto={modalVincularCustoAberto}
            onFechar={() => setModalVincularCustoAberto(false)}
            titulo="Vincular custo existente"
            getId={(p) => p.id}
            buscar={(params) => getPayablesVinculaveis(id, params)}
            onConfirmar={async (ids) => {
              await vincularCustos(id, ids, tipoVinculo);
              setTentativa((t) => t + 1);
            }}
            chaveRecarga={tipoVinculo}
            extra={
              <div className="w-44">
                <Select
                  opcoes={[{ value: 'realizado', label: 'Marcar como Realizado' }, { value: 'projetado', label: 'Marcar como Projetado' }]}
                  value={tipoVinculo}
                  onChange={(e) => setTipoVinculo(e.target.value as TipoCusto)}
                />
              </div>
            }
            colunas={[
              { chave: 'fornecedorNome', titulo: 'Fornecedor' },
              { chave: 'documento', titulo: 'Documento' },
              { chave: 'categoriaNome', titulo: 'Categoria' },
              { chave: 'vencimento', titulo: 'Vencimento', render: (p) => formatDate(p.vencimento) },
              { chave: 'valor', titulo: 'Valor', alinhamento: 'direita', render: (p) => formatCurrency(p.valor) },
            ]}
          />

          <LinkExistingModal<ReceitaVinculavel>
            aberto={modalVincularReceitaAberto}
            onFechar={() => setModalVincularReceitaAberto(false)}
            titulo="Vincular receita existente"
            getId={(r) => r.id}
            buscar={(params) => getReceitasVinculaveis(id, params)}
            onConfirmar={async (ids) => {
              await vincularReceitas(id, ids);
              setTentativa((t) => t + 1);
            }}
            colunas={[
              { chave: 'clienteNome', titulo: 'Cliente' },
              { chave: 'documento', titulo: 'Documento' },
              { chave: 'vencimento', titulo: 'Vencimento', render: (r) => formatDate(r.vencimento) },
              { chave: 'valor', titulo: 'Valor', alinhamento: 'direita', render: (r) => formatCurrency(r.valor) },
            ]}
          />
        </>
      )}

      <ContractFormModal
        aberto={modalEditarAberto}
        onFechar={() => setModalEditarAberto(false)}
        onSalvo={() => setTentativa((t) => t + 1)}
        companies={companies}
        contrato={contratoParaEdicao}
      />
    </div>
  );
}
