import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo';
type Tamanho = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: Tamanho;
  icone?: ReactNode;
  iconeDireita?: ReactNode;
}

const VARIANTE_CLASSES: Record<Variante, string> = {
  primario: 'bg-graphite-900 text-white hover:bg-graphite-800 focus-visible:outline-graphite-900',
  secundario:
    'bg-white text-graphite-700 ring-1 ring-inset ring-graphite-300 hover:bg-graphite-50 focus-visible:outline-graphite-400',
  fantasma: 'text-graphite-600 hover:bg-graphite-100 focus-visible:outline-graphite-300',
  perigo: 'bg-negative-600 text-white hover:bg-negative-700 focus-visible:outline-negative-600',
};

const TAMANHO_CLASSES: Record<Tamanho, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

export function Button({
  variante = 'primario',
  tamanho = 'md',
  icone,
  iconeDireita,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTE_CLASSES[variante],
        TAMANHO_CLASSES[tamanho],
        className,
      )}
      {...props}
    >
      {icone}
      {children}
      {iconeDireita}
    </button>
  );
}
