import type { Company } from '@/types';
import { clsx } from 'clsx';

function iniciais(nome: string): string {
  const palavras = nome.split(' ').filter(Boolean);
  if (palavras.length === 1) return palavras[0].slice(0, 2).toUpperCase();
  return (palavras[0][0] + palavras[palavras.length - 1][0]).toUpperCase();
}

export function CompanyAvatar({ company, size = 'md' }: { company: Company; size?: 'sm' | 'md' }) {
  return (
    <span
      className={clsx(
        'flex flex-shrink-0 items-center justify-center rounded-full font-semibold text-white',
        size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-9 w-9 text-xs',
      )}
      style={{ backgroundColor: company.color }}
      title={company.name}
    >
      {iniciais(company.name)}
    </span>
  );
}
