import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { clsx } from 'clsx';
import type { OrdenacaoState } from '@/types';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export interface DataTableColumn<T> {
  chave: Extract<keyof T, string>;
  titulo: string;
  render?: (item: T) => ReactNode;
  ordenavel?: boolean;
  alinhamento?: 'esquerda' | 'direita' | 'centro';
  largura?: string;
}

interface DataTableProps<T> {
  colunas: DataTableColumn<T>[];
  dados: T[];
  getId: (item: T) => string;
  onRowClick?: (item: T) => void;
  carregando?: boolean;
  ordenacao?: OrdenacaoState<Extract<keyof T, string>>;
  onOrdenacaoChange?: (ordenacao: OrdenacaoState<Extract<keyof T, string>>) => void;
  selecionados?: Set<string>;
  onSelecaoChange?: (selecionados: Set<string>) => void;
}

const ALINHAMENTO_CLASSES: Record<NonNullable<DataTableColumn<unknown>['alinhamento']>, string> = {
  esquerda: 'text-left',
  direita: 'text-right',
  centro: 'text-center',
};

export function DataTable<T>({
  colunas,
  dados,
  getId,
  onRowClick,
  carregando,
  ordenacao,
  onOrdenacaoChange,
  selecionados,
  onSelecaoChange,
}: DataTableProps<T>) {
  const permiteSelecao = Boolean(selecionados && onSelecaoChange);
  const todosSelecionados = permiteSelecao && dados.length > 0 && dados.every((item) => selecionados!.has(getId(item)));

  const alternarSelecaoTodos = () => {
    if (!onSelecaoChange) return;
    if (todosSelecionados) {
      onSelecaoChange(new Set());
    } else {
      onSelecaoChange(new Set(dados.map(getId)));
    }
  };

  const alternarSelecaoItem = (id: string) => {
    if (!selecionados || !onSelecaoChange) return;
    const novo = new Set(selecionados);
    if (novo.has(id)) {
      novo.delete(id);
    } else {
      novo.add(id);
    }
    onSelecaoChange(novo);
  };

  const solicitarOrdenacao = (chave: Extract<keyof T, string>) => {
    if (!onOrdenacaoChange) return;
    if (ordenacao?.campo === chave) {
      onOrdenacaoChange({ campo: chave, direcao: ordenacao.direcao === 'asc' ? 'desc' : 'asc' });
    } else {
      onOrdenacaoChange({ campo: chave, direcao: 'asc' });
    }
  };

  if (carregando) {
    return <TableSkeleton colunas={colunas.length} />;
  }

  if (dados.length === 0) {
    return <EmptyState titulo="Nenhum registro encontrado" descricao="Ajuste os filtros para ver mais resultados." />;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-graphite-200 bg-graphite-50/60">
            {permiteSelecao && (
              <th className="w-10 px-5 py-3">
                <input
                  type="checkbox"
                  checked={todosSelecionados}
                  onChange={alternarSelecaoTodos}
                  className="h-4 w-4 rounded border-graphite-300 text-brand-600 focus:ring-brand-500"
                />
              </th>
            )}
            {colunas.map((coluna) => (
              <th
                key={coluna.chave}
                style={{ width: coluna.largura }}
                className={clsx(
                  'whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-graphite-500',
                  ALINHAMENTO_CLASSES[coluna.alinhamento ?? 'esquerda'],
                )}
              >
                {coluna.ordenavel ? (
                  <button
                    type="button"
                    onClick={() => solicitarOrdenacao(coluna.chave)}
                    className="inline-flex items-center gap-1 hover:text-graphite-800"
                  >
                    {coluna.titulo}
                    {ordenacao?.campo === coluna.chave ? (
                      ordenacao.direcao === 'asc' ? (
                        <ArrowUp className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 text-graphite-300" />
                    )}
                  </button>
                ) : (
                  coluna.titulo
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.map((item) => {
            const id = getId(item);
            return (
              <tr
                key={id}
                onClick={() => onRowClick?.(item)}
                className={clsx(
                  'border-b border-graphite-100 transition-colors last:border-0',
                  onRowClick && 'cursor-pointer hover:bg-brand-50/40',
                )}
              >
                {permiteSelecao && (
                  <td className="px-5 py-3.5" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selecionados!.has(id)}
                      onChange={() => alternarSelecaoItem(id)}
                      className="h-4 w-4 rounded border-graphite-300 text-brand-600 focus:ring-brand-500"
                    />
                  </td>
                )}
                {colunas.map((coluna) => (
                  <td
                    key={coluna.chave}
                    className={clsx(
                      'whitespace-nowrap px-5 py-3.5 text-graphite-700',
                      ALINHAMENTO_CLASSES[coluna.alinhamento ?? 'esquerda'],
                    )}
                  >
                    {coluna.render ? coluna.render(item) : String(item[coluna.chave] ?? '—')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
