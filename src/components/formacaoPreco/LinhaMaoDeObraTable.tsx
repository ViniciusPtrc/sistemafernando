import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/utils/format';
import { novaLinhaMaoDeObra } from '@/utils/formacaoPrecoCalculo';
import type { LinhaMaoDeObra } from '@/types';

interface LinhaMaoDeObraTableProps {
  itens: LinhaMaoDeObra[];
  onChange: (itens: LinhaMaoDeObra[]) => void;
  jornadaIntegralHorasDia: number;
}

function calcularCustoLinha(item: LinhaMaoDeObra, jornadaIntegralHorasDia: number): number {
  return item.quantidade * item.meses * item.salarioMensal * (item.dedicacaoHorasDia / jornadaIntegralHorasDia);
}

/**
 * Salário-base é o valor de tempo integral (jornada definida em "Dados do processo");
 * "dedicação (h/dia)" rateia esse valor proporcionalmente — metade da jornada = 50%
 * do salário-base entra na conta.
 */
export function LinhaMaoDeObraTable({ itens, onChange, jornadaIntegralHorasDia }: LinhaMaoDeObraTableProps) {
  const atualizar = (id: string, patch: Partial<LinhaMaoDeObra>) => {
    onChange(itens.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };
  const remover = (id: string) => onChange(itens.filter((item) => item.id !== id));
  const adicionar = () => onChange([...itens, novaLinhaMaoDeObra(jornadaIntegralHorasDia)]);

  const subtotal = itens.reduce((s, i) => s + calcularCustoLinha(i, jornadaIntegralHorasDia), 0);

  return (
    <div className="flex flex-col gap-2">
      {itens.length > 0 && (
        <div className="hidden gap-2 px-1 text-[11px] font-medium text-graphite-400 sm:grid sm:grid-cols-[1fr_70px_70px_90px_120px_120px_32px]">
          <span>Cargo / profissão</span>
          <span>Qtd.</span>
          <span>Meses</span>
          <span>Dedicação (h/dia)</span>
          <span>Salário-base ({jornadaIntegralHorasDia}h/dia)</span>
          <span className="text-right">Total (rateado)</span>
          <span />
        </div>
      )}

      {itens.map((item) => (
        <div key={item.id} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_70px_70px_90px_120px_120px_32px] sm:items-center">
          <Input
            value={item.descricao}
            onChange={(e) => atualizar(item.id, { descricao: e.target.value })}
            placeholder="Ex.: Mecânico Técnico IV"
            className="col-span-2 sm:col-span-1"
          />
          <Input type="number" min={0} value={item.quantidade} onChange={(e) => atualizar(item.id, { quantidade: Number(e.target.value) })} />
          <Input type="number" min={0} value={item.meses} onChange={(e) => atualizar(item.id, { meses: Number(e.target.value) })} />
          <Input type="number" min={0} max={24} step="0.1" value={item.dedicacaoHorasDia} onChange={(e) => atualizar(item.id, { dedicacaoHorasDia: Number(e.target.value) })} />
          <Input type="number" min={0} step="0.01" value={item.salarioMensal} onChange={(e) => atualizar(item.id, { salarioMensal: Number(e.target.value) })} />
          <span className="text-right text-sm font-medium text-graphite-700">{formatCurrency(calcularCustoLinha(item, jornadaIntegralHorasDia))}</span>
          <button type="button" onClick={() => remover(item.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-graphite-400 hover:bg-negative-50 hover:text-negative-600" aria-label="Remover">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between pt-1">
        <Button variante="secundario" tamanho="sm" icone={<Plus className="h-3.5 w-3.5" />} onClick={adicionar}>
          Adicionar cargo
        </Button>
        {itens.length > 0 && (
          <span className="text-sm text-graphite-600">
            Subtotal: <strong className="text-graphite-900">{formatCurrency(subtotal)}</strong>
          </span>
        )}
      </div>
    </div>
  );
}
