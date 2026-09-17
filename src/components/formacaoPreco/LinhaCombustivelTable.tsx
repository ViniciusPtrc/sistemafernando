import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/utils/format';
import { novaLinhaCombustivel } from '@/utils/formacaoPrecoCalculo';
import type { LinhaCombustivel } from '@/types';

interface LinhaCombustivelTableProps {
  itens: LinhaCombustivel[];
  onChange: (itens: LinhaCombustivel[]) => void;
}

export function LinhaCombustivelTable({ itens, onChange }: LinhaCombustivelTableProps) {
  const atualizar = (id: string, patch: Partial<LinhaCombustivel>) => {
    onChange(itens.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };
  const remover = (id: string) => onChange(itens.filter((item) => item.id !== id));
  const adicionar = () => onChange([...itens, novaLinhaCombustivel()]);

  const total = itens.reduce((s, i) => s + (i.quantidade * i.kmPorAno * i.precoLitro) / (i.kmPorLitro || 1), 0);

  return (
    <div className="flex flex-col gap-2">
      {itens.length > 0 && (
        <div className="hidden gap-2 px-1 text-[11px] font-medium text-graphite-400 sm:grid sm:grid-cols-[1fr_70px_100px_100px_110px_120px_32px]">
          <span>Descrição</span>
          <span>Qtd.</span>
          <span>Km/ano</span>
          <span>Km/litro</span>
          <span>Preço/litro (R$)</span>
          <span className="text-right">Total/ano</span>
          <span />
        </div>
      )}

      {itens.map((item) => (
        <div key={item.id} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_70px_100px_100px_110px_120px_32px] sm:items-center">
          <Input value={item.descricao} onChange={(e) => atualizar(item.id, { descricao: e.target.value })} placeholder="Descrição" className="col-span-2 sm:col-span-1" />
          <Input type="number" min={0} value={item.quantidade} onChange={(e) => atualizar(item.id, { quantidade: Number(e.target.value) })} />
          <Input type="number" min={0} value={item.kmPorAno} onChange={(e) => atualizar(item.id, { kmPorAno: Number(e.target.value) })} />
          <Input type="number" min={0.1} step="0.1" value={item.kmPorLitro} onChange={(e) => atualizar(item.id, { kmPorLitro: Number(e.target.value) })} />
          <Input type="number" min={0} step="0.01" value={item.precoLitro} onChange={(e) => atualizar(item.id, { precoLitro: Number(e.target.value) })} />
          <span className="text-right text-sm font-medium text-graphite-700">{formatCurrency((item.quantidade * item.kmPorAno * item.precoLitro) / (item.kmPorLitro || 1))}</span>
          <button type="button" onClick={() => remover(item.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-graphite-400 hover:bg-negative-50 hover:text-negative-600" aria-label="Remover">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between pt-1">
        <Button variante="secundario" tamanho="sm" icone={<Plus className="h-3.5 w-3.5" />} onClick={adicionar}>
          Adicionar veículo
        </Button>
        {itens.length > 0 && (
          <span className="text-sm text-graphite-600">
            Combustível: <strong className="text-graphite-900">{formatCurrency(total)}</strong>
          </span>
        )}
      </div>
    </div>
  );
}
