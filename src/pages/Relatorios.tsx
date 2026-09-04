import { useEffect, useState } from 'react';
import {
  BadgeDollarSign,
  Building2,
  FileBarChart,
  FileText,
  Landmark,
  PieChart,
  ScrollText,
  TrendingUp,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ReportPreviewModal } from '@/components/reports/ReportPreviewModal';
import { getRelatoriosDisponiveis } from '@/services/relatoriosService';
import type { DefinicaoRelatorio, TipoRelatorio } from '@/types';

const ICONES: Record<TipoRelatorio, typeof FileText> = {
  contas_pagar: Landmark,
  contas_receber: BadgeDollarSign,
  inadimplencia: ScrollText,
  fluxo_caixa: TrendingUp,
  por_cliente: Users,
  por_fornecedor: Users,
  por_categoria: PieChart,
  resultado_financeiro: FileBarChart,
  contas_pagar_por_empresa: Landmark,
  contas_receber_por_empresa: BadgeDollarSign,
  fluxo_caixa_por_empresa: TrendingUp,
  inadimplencia_por_empresa: ScrollText,
  resultado_financeiro_por_empresa: FileBarChart,
};

export default function RelatoriosPage() {
  const [relatorios, setRelatorios] = useState<DefinicaoRelatorio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionado, setSelecionado] = useState<DefinicaoRelatorio | null>(null);

  useEffect(() => {
    getRelatoriosDisponiveis().then((resultado) => {
      setRelatorios(resultado);
      setCarregando(false);
    });
  }, []);

  const relatoriosGerais = relatorios.filter((r) => r.grupo === 'geral');
  const relatoriosPorEmpresa = relatorios.filter((r) => r.grupo === 'empresa');

  return (
    <div className="flex flex-col gap-8">
      <PageHeader titulo="Relatórios" subtitulo="Gere relatórios financeiros detalhados por período e filtros" />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-graphite-900">Relatórios Gerais</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {carregando
            ? Array.from({ length: 8 }).map((_, i) => <RelatorioCardSkeleton key={i} />)
            : relatoriosGerais.map((relatorio) => (
                <RelatorioCard key={relatorio.tipo} relatorio={relatorio} onSelecionar={setSelecionado} />
              ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-graphite-400" />
          <h2 className="text-sm font-semibold text-graphite-900">Relatórios por Empresa</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {carregando
            ? Array.from({ length: 5 }).map((_, i) => <RelatorioCardSkeleton key={i} />)
            : relatoriosPorEmpresa.map((relatorio) => (
                <RelatorioCard key={relatorio.tipo} relatorio={relatorio} onSelecionar={setSelecionado} />
              ))}
        </div>
      </section>

      <ReportPreviewModal relatorio={selecionado} onFechar={() => setSelecionado(null)} />
    </div>
  );
}

function RelatorioCard({
  relatorio,
  onSelecionar,
}: {
  relatorio: DefinicaoRelatorio;
  onSelecionar: (relatorio: DefinicaoRelatorio) => void;
}) {
  const Icone = ICONES[relatorio.tipo];
  return (
    <Card className="flex flex-col p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icone className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-graphite-900">{relatorio.titulo}</h3>
      <p className="mt-1.5 flex-1 text-sm text-graphite-500">{relatorio.descricao}</p>
      <Button variante="secundario" className="mt-4 w-full" onClick={() => onSelecionar(relatorio)}>
        Gerar relatório
      </Button>
    </Card>
  );
}

function RelatorioCardSkeleton() {
  return (
    <Card className="p-5">
      <Skeleton className="h-9 w-9 rounded-lg" />
      <Skeleton className="mt-4 h-4 w-40" />
      <Skeleton className="mt-2 h-3 w-full" />
      <Skeleton className="mt-1 h-3 w-2/3" />
    </Card>
  );
}
