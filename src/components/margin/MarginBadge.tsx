import type { ClassificacaoMargem } from '@/types';

const ESTILOS: Record<ClassificacaoMargem['nivel'], string> = {
  excelente: 'bg-positive-50 text-positive-700',
  boa: 'bg-positive-50 text-positive-600',
  atencao: 'bg-amber-50 text-amber-700',
  critica: 'bg-orange-50 text-orange-700',
  prejuizo: 'bg-negative-50 text-negative-700',
  indefinida: 'bg-graphite-100 text-graphite-500',
};

const PONTOS: Record<ClassificacaoMargem['nivel'], string> = {
  excelente: 'bg-positive-500',
  boa: 'bg-positive-400',
  atencao: 'bg-amber-500',
  critica: 'bg-orange-500',
  prejuizo: 'bg-negative-500',
  indefinida: 'bg-graphite-400',
};

export function MarginBadge({ classificacao }: { classificacao: ClassificacaoMargem }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ESTILOS[classificacao.nivel]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${PONTOS[classificacao.nivel]}`} />
      {classificacao.label}
    </span>
  );
}
