import { Menu } from 'lucide-react';
import { CompanySelector } from './CompanySelector';

export function Header({ onAbrirMenuMobile }: { onAbrirMenuMobile: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center gap-3 border-b border-graphite-200 bg-white/80 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onAbrirMenuMobile}
        className="rounded-md p-2 text-graphite-600 hover:bg-graphite-100 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <span className="text-sm font-semibold text-graphite-900 lg:hidden">Finance Dashboard</span>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-xs font-medium uppercase tracking-wide text-graphite-400 sm:block">Empresa</span>
        <CompanySelector />
      </div>
    </header>
  );
}
