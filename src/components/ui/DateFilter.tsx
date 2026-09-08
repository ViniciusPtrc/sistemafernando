import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import type { PeriodoFiltro, PeriodoPreset } from '@/types';
import { calcularRangePreset, PERIODO_LABELS } from '@/utils/periodo';
import { formatDate } from '@/utils/format';
import { useDisclosure } from '@/hooks/useDisclosure';

const PRESETS_PADRAO: PeriodoPreset[] = [
  'hoje',
  'esta_semana',
  'este_mes',
  'mes_anterior',
  'ultimos_3_meses',
  'personalizado',
];

interface DateFilterProps {
  valor: PeriodoFiltro;
  onChange: (periodo: PeriodoFiltro) => void;
  /** Restringe as opções exibidas (ex.: Margem de Contratos usa 3/6/12/24/36 meses, ano atual/anterior). */
  presets?: PeriodoPreset[];
}

export function DateFilter({ valor, onChange, presets = PRESETS_PADRAO }: DateFilterProps) {
  const { aberto, alternar, fechar } = useDisclosure();
  const [rangeCustom, setRangeCustom] = useState(valor.range);

  const selecionarPreset = (preset: PeriodoPreset) => {
    if (preset === 'personalizado') {
      onChange({ preset, range: rangeCustom });
      return;
    }
    onChange({ preset, range: calcularRangePreset(preset) });
    fechar();
  };

  const aplicarCustom = () => {
    onChange({ preset: 'personalizado', range: rangeCustom });
    fechar();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={alternar}
        className="flex h-10 items-center gap-2 rounded-lg border border-graphite-300 bg-white px-3.5 text-sm font-medium text-graphite-700 hover:bg-graphite-50"
      >
        <Calendar className="h-4 w-4 text-graphite-500" />
        {valor.preset === 'personalizado'
          ? `${formatDate(valor.range.inicio)} — ${formatDate(valor.range.fim)}`
          : PERIODO_LABELS[valor.preset]}
        <ChevronDown className="h-4 w-4 text-graphite-400" />
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-10" onClick={fechar} />
          <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-graphite-200 bg-white p-2 shadow-lg">
            <ul className="flex flex-col">
              {presets.map((preset) => (
                <li key={preset}>
                  <button
                    type="button"
                    onClick={() => selecionarPreset(preset)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-graphite-50 ${
                      valor.preset === preset ? 'bg-brand-50 text-brand-700' : 'text-graphite-700'
                    }`}
                  >
                    {PERIODO_LABELS[preset]}
                  </button>
                </li>
              ))}
            </ul>

            {valor.preset === 'personalizado' && (
              <div className="mt-2 flex flex-col gap-2 border-t border-graphite-100 p-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
                  Data inicial
                  <input
                    type="date"
                    value={rangeCustom.inicio}
                    onChange={(event) => setRangeCustom((r) => ({ ...r, inicio: event.target.value }))}
                    className="h-9 rounded-md border border-graphite-300 px-2 text-sm text-graphite-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
                  Data final
                  <input
                    type="date"
                    value={rangeCustom.fim}
                    onChange={(event) => setRangeCustom((r) => ({ ...r, fim: event.target.value }))}
                    className="h-9 rounded-md border border-graphite-300 px-2 text-sm text-graphite-900"
                  />
                </label>
                <button
                  type="button"
                  onClick={aplicarCustom}
                  className="mt-1 h-9 rounded-md bg-graphite-900 text-sm font-medium text-white hover:bg-graphite-800"
                >
                  Aplicar
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
