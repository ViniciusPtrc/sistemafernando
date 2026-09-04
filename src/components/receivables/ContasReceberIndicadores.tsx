import type { ReactNode } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Users, Wallet2 } from 'lucide-react';
import type { ResumoContasReceber } from '@/services/contasReceberService';
import { FinancialCard } from '@/components/dashboard/FinancialCard';
import { Card } from '@/components/ui/Card';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatNumber } from '@/utils/format';

export function ContasReceberIndicadores({
  resumo,
  carregando,
}: {
  resumo: ResumoContasReceber | null;
  carregando: boolean;
}) {
  if (carregando || !resumo) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinancialCard
          titulo="Total a Receber"
          valor={formatCurrency(resumo.totalLiquido)}
          icone={<Wallet2 className="h-5 w-5" />}
          tom="destaque"
          linhaDetalhe={`Bruto: ${formatCurrency(resumo.totalBruto)}`}
        />
        <FinancialCard
          titulo="Total Recebido"
          valor={formatCurrency(resumo.recebido)}
          icone={<CheckCircle2 className="h-5 w-5" />}
          tom="positivo"
        />
        <FinancialCard
          titulo="Total Vencido"
          valor={formatCurrency(resumo.vencido)}
          icone={<AlertTriangle className="h-5 w-5" />}
          tom="negativo"
        />
        <FinancialCard
          titulo="Total a Vencer"
          valor={formatCurrency(resumo.aVencer)}
          icone={<CalendarClock className="h-5 w-5" />}
          tom="neutro"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <IndicadorCompacto label="Total em Aberto" valor={formatCurrency(resumo.emAberto)} />
        <IndicadorCompacto
          label="Quantidade de Títulos"
          valor={formatNumber(resumo.quantidadeTitulos)}
          icone={<Wallet2 className="h-3.5 w-3.5" />}
        />
        <IndicadorCompacto
          label="Quantidade de Clientes"
          valor={formatNumber(resumo.quantidadeClientes)}
          icone={<Users className="h-3.5 w-3.5" />}
        />
        <IndicadorCompacto label="Retenções / Ajustes" valor={formatCurrency(resumo.totalBruto - resumo.totalLiquido)} />
      </div>
    </div>
  );
}

function IndicadorCompacto({ label, valor, icone }: { label: string; valor: string; icone?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-graphite-400">
        {icone}
        <p className="text-xs font-medium text-graphite-500">{label}</p>
      </div>
      <p className="mt-1.5 text-base font-semibold text-graphite-900">{valor}</p>
    </Card>
  );
}
