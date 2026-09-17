import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/utils/format';
import { novaLinhaCusto } from '@/utils/formacaoPrecoCalculo';
import type { LinhaCusto } from '@/types';

interface LinhaCustoTableProps {
  itens: LinhaCusto[];
  onChange: (itens: LinhaCusto[]) => void;
  rotuloQuantidade?: string;
  rotuloVezesPorAno?: string;
  rotuloValorUnitario?: string;
  vezesPorAnoPadrao?: number;
  rotuloBotaoAdicionar?: string;
}

export function LinhaCustoTable({
  itens,
  onChange,
  rotuloQuantidade = 'Qtd.',
  rotuloVezesPorAno = 'Vezes/ano',
  rotuloValorUnitario = 'Valor unit. (R$)',
  vezesPorAnoPadrao = 12,
  rotuloBotaoAdicionar = 'Adicionar item',
}: LinhaCustoTableProps) {
  const atualizar = (id: string, patch: Partial<LinhaCusto>) => {
    onChange(itens.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };
  const remover = (id: string) => onChange(itens.filter((item) => item.id !== id));
  const adicionar = () => onChange([...itens, novaLinhaCusto(vezesPorAnoPadrao)]);

  const subtotal = itens.reduce((s, i) => s + i.quantidade * i.vezesPorAno * i.valorUnitario, 0);

  return (
    <div className="flex flex-col gap-2">
      {itens.length > 0 && (
        <div className="hidden gap-2 px-1 text-[11px] font-medium text-graphite-400 sm:grid sm:grid-cols-[1fr_80px_100px_120px_120px_32px]">
          <span>Descrição</span>
          <span>{rotuloQuantidade}</span>
          <span>{rotuloVezesPorAno}</span>
          <span>{rotuloValorUnitario}</span>
          <span className="text-right">Total</span>
          <span />
        </div>
      )}

      {itens.map((item) => (
        <div key={item.id} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_80px_100px_120px_120px_32px] sm:items-center">
          <Input value={item.descricao} onChange={(e) => atualizar(item.id, { descricao: e.target.value })} placeholder="Descrição" className="col-span-2 sm:col-span-1" />
          <Input type="number" min={0} value={item.quantidade} onChange={(e) => atualizar(item.id, { quantidade: Number(e.target.value) })} />
          <Input type="number" min={0} value={item.vezesPorAno} onChange={(e) => atualizar(item.id, { vezesPorAno: Number(e.target.value) })} />
          <Input type="number" min={0} step="0.01" value={item.valorUnitario} onChange={(e) => atualizar(item.id, { valorUnitario: Number(e.target.value) })} />
          <span className="text-right text-sm font-medium text-graphite-700">{formatCurrency(item.quantidade * item.vezesPorAno * item.valorUnitario)}</span>
          <button type="button" onClick={() => remover(item.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-graphite-400 hover:bg-negative-50 hover:text-negative-600" aria-label="Remover">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between pt-1">
        <Button variante="secundario" tamanho="sm" icone={<Plus className="h-3.5 w-3.5" />} onClick={adicionar}>
          {rotuloBotaoAdicionar}
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
