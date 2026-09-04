import type { InputHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icone?: ReactNode;
}

export function Input({ icone, className, ...props }: InputProps) {
  return (
    <div className="relative">
      {icone && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-graphite-400">
          {icone}
        </span>
      )}
      <input
        className={clsx(
          'h-10 w-full rounded-lg border border-graphite-300 bg-white text-sm text-graphite-900 placeholder:text-graphite-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
          icone ? 'pl-9 pr-3' : 'px-3',
          className,
        )}
        {...props}
      />
    </div>
  );
}
