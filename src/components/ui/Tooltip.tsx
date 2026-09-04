import type { ReactNode } from 'react';
import { useState } from 'react';

export function Tooltip({ texto, children }: { texto: string; children: ReactNode }) {
  const [visivel, setVisivel] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisivel(true)}
      onMouseLeave={() => setVisivel(false)}
      onFocus={() => setVisivel(true)}
      onBlur={() => setVisivel(false)}
    >
      {children}
      {visivel && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-graphite-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
          {texto}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-graphite-900" />
        </span>
      )}
    </span>
  );
}
