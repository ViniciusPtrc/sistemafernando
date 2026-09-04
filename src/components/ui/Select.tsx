import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

interface OpcaoSelect {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  opcoes: OpcaoSelect[];
  placeholder?: string;
}

export function Select({ opcoes, placeholder, className, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={clsx(
          'h-10 w-full appearance-none rounded-lg border border-graphite-300 bg-white pl-3 pr-9 text-sm text-graphite-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
          className,
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {opcoes.map((opcao) => (
          <option key={opcao.value} value={opcao.value}>
            {opcao.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
    </div>
  );
}
