import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { AlertaFinanceiro, NivelAlerta } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';

const NIVEL_ESTILO: Record<NivelAlerta, string> = {
  critico: 'bg-negative-50 border-negative-100 text-negative-700',
  atencao: 'bg-warning-50 border-warning-100 text-warning-700',
  sucesso: 'bg-positive-50 border-positive-100 text-positive-700',
};

const NIVEL_ICONE: Record<NivelAlerta, typeof XCircle> = {
  critico: XCircle,
  atencao: AlertTriangle,
  sucesso: CheckCircle2,
};

const NIVEL_ICONE_COR: Record<NivelAlerta, string> = {
  critico: 'text-negative-500',
  atencao: 'text-warning-500',
  sucesso: 'text-positive-500',
};

export function AlertsPanel({ alertas }: { alertas: AlertaFinanceiro[] }) {
  if (alertas.length === 0) {
    return <EmptyState titulo="Nenhum alerta no momento" descricao="Tudo em ordem para o período selecionado." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {alertas.map((alerta) => {
        const Icone = NIVEL_ICONE[alerta.nivel];
        return (
          <div
            key={alerta.id}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3.5 ${NIVEL_ESTILO[alerta.nivel]}`}
          >
            <Icone className={`mt-0.5 h-5 w-5 flex-shrink-0 ${NIVEL_ICONE_COR[alerta.nivel]}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{alerta.mensagem}</p>
              {alerta.detalhe && <p className="mt-0.5 text-xs opacity-80">{alerta.detalhe}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
