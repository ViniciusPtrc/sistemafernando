import { NavLink } from 'react-router-dom';
import {
  ArrowLeftRight,
  ChevronsLeft,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Settings,
  UploadCloud,
  User,
  Wallet,
  Wallet2,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {
  to: string;
  label: string;
  icone: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icone: LayoutDashboard },
  { to: '/contas-pagar', label: 'Contas a Pagar', icone: Wallet },
  { to: '/contas-receber', label: 'Contas a Receber', icone: Wallet2 },
  { to: '/fluxo-caixa', label: 'Fluxo de Caixa', icone: ArrowLeftRight },
  { to: '/relatorios', label: 'Relatórios', icone: FileBarChart },
  { to: '/importacao', label: 'Importação de Dados', icone: UploadCloud },
  { to: '/configuracoes', label: 'Configurações', icone: Settings },
];

interface SidebarProps {
  recolhida: boolean;
  onAlternarRecolhida: () => void;
  abertaMobile: boolean;
  onFecharMobile: () => void;
}

export function Sidebar({ recolhida, onAlternarRecolhida, abertaMobile, onFecharMobile }: SidebarProps) {
  return (
    <>
      {abertaMobile && (
        <div className="fixed inset-0 z-40 bg-graphite-950/50 lg:hidden" onClick={onFecharMobile} />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-graphite-200 bg-white transition-all duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          recolhida ? 'lg:w-[76px]' : 'lg:w-64',
          abertaMobile ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-graphite-200 px-4">
          <div className={clsx('flex items-center gap-2.5 overflow-hidden', recolhida && 'lg:justify-center')}>
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-graphite-900 text-sm font-bold text-white">
              FN
            </div>
            <span className={clsx('truncate text-sm font-semibold text-graphite-900', recolhida && 'lg:hidden')}>
              Finance Dashboard
            </span>
          </div>
          <button
            type="button"
            onClick={onFecharMobile}
            className="rounded-md p-1 text-graphite-400 hover:bg-graphite-100 lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ to, label, icone: Icone }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  onClick={onFecharMobile}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      recolhida && 'lg:justify-center lg:px-0',
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-graphite-600 hover:bg-graphite-100 hover:text-graphite-900',
                    )
                  }
                  title={recolhida ? label : undefined}
                >
                  <Icone className="h-[18px] w-[18px] flex-shrink-0" />
                  <span className={clsx(recolhida && 'lg:hidden')}>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-shrink-0 flex-col gap-1 border-t border-graphite-200 px-3 py-4">
          <NavLink
            to="/configuracoes"
            onClick={onFecharMobile}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                recolhida && 'lg:justify-center lg:px-0',
                isActive ? 'bg-brand-50 text-brand-700' : 'text-graphite-600 hover:bg-graphite-100 hover:text-graphite-900',
              )
            }
            title={recolhida ? 'Configurações' : undefined}
          >
            <Settings className="h-[18px] w-[18px] flex-shrink-0" />
            <span className={clsx(recolhida && 'lg:hidden')}>Configurações</span>
          </NavLink>

          <button
            type="button"
            className={clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-graphite-600 transition-colors hover:bg-graphite-100 hover:text-graphite-900',
              recolhida && 'lg:justify-center lg:px-0',
            )}
            title={recolhida ? 'Sair' : undefined}
          >
            <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
            <span className={clsx(recolhida && 'lg:hidden')}>Sair</span>
          </button>

          <div
            className={clsx(
              'mt-2 flex items-center gap-2.5 rounded-lg bg-graphite-50 px-3 py-2.5',
              recolhida && 'lg:justify-center lg:px-0',
            )}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-graphite-800 text-xs font-semibold text-white">
              <User className="h-4 w-4" />
            </div>
            <div className={clsx('min-w-0 flex-1 overflow-hidden', recolhida && 'lg:hidden')}>
              <p className="truncate text-xs font-semibold text-graphite-800">Vinicius Patricio</p>
              <p className="truncate text-[11px] text-graphite-400">Administrador</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onAlternarRecolhida}
            className="mt-1 hidden h-8 items-center justify-center rounded-lg text-graphite-400 hover:bg-graphite-100 hover:text-graphite-600 lg:flex"
            aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'}
          >
            <ChevronsLeft className={clsx('h-4 w-4 transition-transform', recolhida && 'rotate-180')} />
          </button>
        </div>
      </aside>
    </>
  );
}
