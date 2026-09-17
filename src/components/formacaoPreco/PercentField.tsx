import { Input } from '@/components/ui/Input';

interface PercentFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
}

/** Campo de percentual: guarda fração (0-1), exibe/edita em pontos percentuais (0-100). */
export function PercentField({ label, value, onChange, hint }: PercentFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
      {label}
      <div className="flex items-center gap-1.5">
        <Input type="number" step="0.01" min={0} value={Number((value * 100).toFixed(4))} onChange={(e) => onChange((Number(e.target.value) || 0) / 100)} />
        <span className="text-xs text-graphite-400">%</span>
      </div>
      {hint && <span className="text-[11px] font-normal text-graphite-400">{hint}</span>}
    </label>
  );
}
