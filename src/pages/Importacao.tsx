import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BadgeDollarSign, Database, Wallet } from 'lucide-react';
import { clsx } from 'clsx';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { CompanyAvatar } from '@/components/ui/CompanyAvatar';
import { DataTable, type DataTableColumn } from '@/components/tables/DataTable';
import { ImportDropzone } from '@/components/import/ImportDropzone';
import { ImportPreviewTable } from '@/components/import/ImportPreviewTable';
import { ImportProgress } from '@/components/import/ImportProgress';
import { ImportResult } from '@/components/import/ImportResult';
import { gerarPreview, getHistoricoImportacoes, importarDados } from '@/services/importacaoService';
import { useCompany } from '@/hooks/useCompany';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/utils/format';
import type {
  FonteImportacao,
  HistoricoImportacao,
  PreviewImportacao,
  ResultadoImportacao,
  TipoImportacao,
} from '@/types';

type Etapa = 'upload' | 'gerando_preview' | 'preview' | 'progresso' | 'resultado';

const FONTES: { fonte: FonteImportacao; titulo: string; descricao: string }[] = [
  { fonte: 'legacy', titulo: 'Sistema antigo', descricao: 'Relatório "Contas a Receber Anual" e planilhas do sistema financeiro anterior.' },
  { fonte: 'totvs', titulo: 'TOTVS', descricao: 'Exportações do TOTVS — ex.: relatório "Posição de clientes".' },
];

const FONTE_LABEL: Record<FonteImportacao, string> = {
  legacy: 'Sistema antigo',
  totvs: 'TOTVS',
};

const TIPOS: { tipo: TipoImportacao; titulo: string; descricao: string; icone: typeof Wallet }[] = [
  { tipo: 'contas_pagar', titulo: 'Importar Contas a Pagar', descricao: 'Envie o arquivo exportado do sistema selecionado.', icone: Wallet },
  { tipo: 'contas_receber', titulo: 'Importar Contas a Receber', descricao: 'Envie o arquivo exportado do sistema selecionado.', icone: BadgeDollarSign },
];

const STATUS_ESTILO: Record<HistoricoImportacao['status'], string> = {
  importado: 'bg-positive-50 text-positive-700 ring-1 ring-inset ring-positive-100',
  processando: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200',
  erro: 'bg-negative-50 text-negative-700 ring-1 ring-inset ring-negative-100',
};

const STATUS_LABEL: Record<HistoricoImportacao['status'], string> = {
  importado: 'Importado',
  processando: 'Processando',
  erro: 'Erro',
};

export default function ImportacaoPage() {
  const { companies } = useCompany();
  const { notificar } = useToast();
  const [fonte, setFonte] = useState<FonteImportacao | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [tipoAtivo, setTipoAtivo] = useState<TipoImportacao | null>(null);
  const [etapa, setEtapa] = useState<Etapa>('upload');
  const [preview, setPreview] = useState<PreviewImportacao | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [progresso, setProgresso] = useState(0);
  const [historico, setHistorico] = useState<HistoricoImportacao[]>([]);
  const [filtroFonte, setFiltroFonte] = useState<'' | FonteImportacao>('');
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('');

  const recarregarHistorico = () => {
    getHistoricoImportacoes({
      fonte: filtroFonte || undefined,
      companyId: filtroEmpresa || undefined,
    })
      .then(setHistorico)
      .catch(() => setHistorico([]));
  };

  useEffect(() => {
    recarregarHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroFonte, filtroEmpresa]);

  useEffect(() => {
    if (etapa !== 'progresso') return;
    setProgresso(0);
    const intervalo = setInterval(() => {
      setProgresso((atual) => (atual >= 92 ? atual : atual + Math.random() * 18));
    }, 200);
    return () => clearInterval(intervalo);
  }, [etapa]);

  const resetFluxo = () => {
    setTipoAtivo(null);
    setEtapa('upload');
    setPreview(null);
    setArquivo(null);
    setResultado(null);
  };

  const selecionarFonte = (nova: FonteImportacao) => {
    setFonte(nova);
    setEmpresaId(null);
    resetFluxo();
  };

  const selecionarEmpresa = (id: string) => {
    setEmpresaId(id);
    resetFluxo();
  };

  const iniciarFluxo = (tipo: TipoImportacao) => {
    setTipoAtivo(tipo);
    setEtapa('upload');
    setPreview(null);
    setArquivo(null);
    setResultado(null);
  };

  const handleArquivo = async (arquivoSelecionado: File) => {
    if (!tipoAtivo || !empresaId || !fonte) return;
    setArquivo(arquivoSelecionado);
    setEtapa('gerando_preview');
    try {
      const resultadoPreview = await gerarPreview(tipoAtivo, arquivoSelecionado, empresaId, fonte);
      setPreview(resultadoPreview);
      setEtapa('preview');
    } catch (erro) {
      setEtapa('upload');
      setArquivo(null);
      notificar({
        titulo: 'Falha ao ler o arquivo',
        descricao: erro instanceof Error ? erro.message : 'Não foi possível gerar a pré-visualização.',
        variante: 'erro',
      });
    }
  };

  const confirmarImportacao = async () => {
    if (!tipoAtivo || !preview || !empresaId || !arquivo || !fonte) return;
    setEtapa('progresso');
    try {
      const resultadoImportacao = await importarDados(tipoAtivo, empresaId, arquivo, fonte);
      setProgresso(100);
      setTimeout(() => {
        setResultado(resultadoImportacao);
        setEtapa('resultado');
        recarregarHistorico();
        notificar({
          titulo: 'Importação concluída',
          descricao: `${resultadoImportacao.importados + resultadoImportacao.atualizados} registros processados (${resultadoImportacao.importados} novos, ${resultadoImportacao.atualizados} atualizados).`,
          variante: 'sucesso',
        });
      }, 400);
    } catch (erro) {
      setEtapa('preview');
      notificar({
        titulo: 'Falha na importação',
        descricao: erro instanceof Error ? erro.message : 'Não foi possível concluir a importação.',
        variante: 'erro',
      });
    }
  };

  const voltarParaTipo = () => resetFluxo();

  const reiniciarTudo = () => {
    setFonte(null);
    setEmpresaId(null);
    resetFluxo();
  };

  const empresaAtiva = companies.find((c) => c.id === empresaId) ?? null;
  const podeBloquear = (preview?.camposObrigatoriosFaltando?.length ?? 0) > 0;

  const opcoesEmpresaFiltro = useMemo(
    () => [{ value: '', label: 'Todas as empresas' }, ...companies.map((c) => ({ value: c.id, label: c.name }))],
    [companies],
  );

  const colunasHistorico: DataTableColumn<HistoricoImportacao>[] = [
    { chave: 'data', titulo: 'Data', ordenavel: true, render: (h) => formatDate(h.data) },
    { chave: 'fonte', titulo: 'Fonte', render: (h) => FONTE_LABEL[h.fonte] },
    {
      chave: 'companyId',
      titulo: 'Empresa',
      render: (h) => {
        const empresa = companies.find((c) => c.id === h.companyId);
        return empresa ? (
          <div className="flex items-center gap-2">
            <CompanyAvatar company={empresa} size="sm" />
            <span>{empresa.name}</span>
          </div>
        ) : (
          '—'
        );
      },
    },
    { chave: 'tipo', titulo: 'Tipo', render: (h) => (h.tipo === 'contas_pagar' ? 'Contas a Pagar' : 'Contas a Receber') },
    { chave: 'arquivo', titulo: 'Arquivo' },
    { chave: 'registros', titulo: 'Registros', alinhamento: 'direita' },
    {
      chave: 'status',
      titulo: 'Status',
      render: (h) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_ESTILO[h.status]}`}>
          {STATUS_LABEL[h.status]}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader titulo="Importação de Dados" subtitulo="Importe os dados financeiros dos seus sistemas de origem." />

      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-graphite-900">Fonte dos dados</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FONTES.map(({ fonte: f, titulo, descricao }) => (
            <button
              key={f}
              type="button"
              onClick={() => selecionarFonte(f)}
              className={clsx(
                'flex items-start gap-3 rounded-xl border p-4 text-left transition-colors',
                fonte === f
                  ? 'border-brand-300 bg-brand-50/40 ring-1 ring-brand-200'
                  : 'border-graphite-200 bg-white hover:border-graphite-300 hover:bg-graphite-50/60',
              )}
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Database className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-graphite-900">{titulo}</p>
                <p className="mt-1 text-xs text-graphite-500">{descricao}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {fonte && (
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold text-graphite-900">Qual empresa você está importando?</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {companies.map((empresa) => (
              <button
                key={empresa.id}
                type="button"
                onClick={() => selecionarEmpresa(empresa.id)}
                className={clsx(
                  'flex items-center gap-3 rounded-xl border p-4 text-left transition-colors',
                  empresaId === empresa.id
                    ? 'border-brand-300 bg-brand-50/40 ring-1 ring-brand-200'
                    : 'border-graphite-200 bg-white hover:border-graphite-300 hover:bg-graphite-50/60',
                )}
              >
                <CompanyAvatar company={empresa} />
                <span className="text-sm font-medium text-graphite-800">{empresa.name}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {fonte && empresaAtiva && (
        <div>
          <p className="mb-3 text-sm font-semibold text-graphite-900">Tipo de dados</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {TIPOS.map(({ tipo, titulo, descricao, icone: Icone }) => (
              <button
                key={tipo}
                type="button"
                onClick={() => iniciarFluxo(tipo)}
                className={clsx(
                  'flex items-start gap-4 rounded-xl border p-5 text-left transition-colors',
                  tipoAtivo === tipo
                    ? 'border-brand-300 bg-brand-50/40 ring-1 ring-brand-200'
                    : 'border-graphite-200 bg-white hover:border-graphite-300 hover:bg-graphite-50/60',
                )}
              >
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icone className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-graphite-900">{titulo}</p>
                  <p className="mt-1 text-sm text-graphite-500">{descricao}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {tipoAtivo && empresaAtiva && fonte && (
        <Card className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <button
              type="button"
              onClick={voltarParaTipo}
              className="flex h-8 w-8 items-center justify-center rounded-md text-graphite-400 hover:bg-graphite-100 hover:text-graphite-600"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-semibold text-graphite-900">
              {tipoAtivo === 'contas_pagar' ? 'Importar Contas a Pagar' : 'Importar Contas a Receber'} —{' '}
              {FONTE_LABEL[fonte]} · {empresaAtiva.name}
            </h2>
          </div>

          {(etapa === 'upload' || etapa === 'gerando_preview') && (
            <div className="flex flex-col gap-3">
              {fonte === 'legacy' && tipoAtivo === 'contas_receber' && (
                <p className="rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-3 text-xs text-brand-800">
                  Arquivos <strong>.xls</strong> ou <strong>.xlsx</strong> no layout do relatório "Contas a Receber
                  Anual" são lidos de verdade. Outros formatos genéricos são interpretados pelo cabeçalho das colunas.
                </p>
              )}
              {fonte === 'legacy' && tipoAtivo === 'contas_pagar' && (
                <p className="rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-3 text-xs text-brand-800">
                  Arquivos <strong>.xls</strong> ou <strong>.xlsx</strong> no layout do relatório "Contas a Pagar" são
                  lidos de verdade (fornecedor, título, vencimento, valor previsto/pago e situação). Planilhas genéricas
                  são interpretadas pelo cabeçalho das colunas.
                </p>
              )}
              {fonte === 'totvs' && (
                <p className="rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-3 text-xs text-brand-800">
                  Envie a planilha exportada do TOTVS (<strong>.xlsx</strong>, <strong>.xls</strong> ou{' '}
                  <strong>.csv</strong>). As colunas são reconhecidas pelo nome — ordem e colunas extras não importam.
                </p>
              )}
              <ImportDropzone onArquivoSelecionado={handleArquivo} />
              {etapa === 'gerando_preview' && (
                <p className="text-center text-sm text-graphite-500">Lendo arquivo e gerando pré-visualização...</p>
              )}
            </div>
          )}

          {etapa === 'preview' && preview && (
            <div className="flex flex-col gap-5">
              <ImportPreviewTable preview={preview} />
              <div className="flex justify-end gap-2">
                <Button variante="secundario" onClick={voltarParaTipo}>
                  Cancelar
                </Button>
                <Button onClick={confirmarImportacao} disabled={podeBloquear}>
                  Importar dados
                </Button>
              </div>
            </div>
          )}

          {etapa === 'progresso' && <ImportProgress progresso={progresso} />}

          {etapa === 'resultado' && resultado && (
            <div className="flex flex-col gap-5">
              <ImportResult resultado={resultado} />
              <div className="flex justify-end">
                <Button onClick={reiniciarTudo}>Nova importação</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card>
        <div className="flex flex-col gap-3 border-b border-graphite-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-graphite-900">Histórico de Importações</h2>
          <div className="flex flex-wrap gap-2">
            <Select
              className="h-9 w-44"
              value={filtroFonte}
              onChange={(e) => setFiltroFonte(e.target.value as '' | FonteImportacao)}
              opcoes={[
                { value: '', label: 'Todas as fontes' },
                { value: 'legacy', label: 'Sistema antigo' },
                { value: 'totvs', label: 'TOTVS' },
              ]}
            />
            <Select
              className="h-9 w-52"
              value={filtroEmpresa}
              onChange={(e) => setFiltroEmpresa(e.target.value)}
              opcoes={opcoesEmpresaFiltro}
            />
          </div>
        </div>
        <DataTable colunas={colunasHistorico} dados={historico} getId={(h) => h.id} />
      </Card>
    </div>
  );
}
