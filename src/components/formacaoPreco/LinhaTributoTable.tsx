import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPercent } from '@/utils/format';
import { novaLinhaTributo } from '@/utils/formacaoPrecoCalculo';
import type { LinhaTributo } from '@/types';

interface LinhaTributoTableProps {
  itens: LinhaTributo[];
  onChange: (itens: LinhaTributo[]) => void;
  tributosPercentTotal: number;
}

/**
 * Documenta a composição dos tributos (ISS/PIS/COFINS/CPRB…) para auditoria —
 * não substitui `tributosSobreCustoPercent`/`tributosSobreReceitaPercent`, que
 * continuam sendo os valores usados no cálculo do preço. Se a soma divergir, é só
 * um aviso: o dado original nunca é sobrescrito.
 */
export function LinhaTributoTable({ itens, onChange, tributosPercentTotal }: LinhaTributoTableProps) {
  const atualizar = (id: string, patch: Partial<LinhaTributo>) => {
    onChange(itens.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };
  const remover = (id: string) => onChange(itens.filter((item) => item.id !== id));
  const adicionar = () => onChange([...itens, novaLinhaTributo()]);

  const somaAliquotas = itens.reduce((s, i) => s + i.aliquotaPercent, 0);
  const divergente = itens.length > 0 && Math.abs(somaAliquotas - tributosPercentTotal * 100) > 0.05;

  return (
    <div className="flex flex-col gap-2">
      {itens.length > 0 && (
        <div className="hidden gap-2 px-1 text-[11px] font-medium text-graphite-400 sm:grid sm:grid-cols-[1fr_90px_1fr_32px]">
          <span>Tributo</span>
          <span>Alíquota (%)</span>
          <span>Observação</span>
          <span />
        </div>
      )}

      {itens.map((item) => (
        <div key={item.id} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_90px_1fr_32px] sm:items-center">
          <Input value={item.nome} onChange={(e) => atualizar(item.id, { nome: e.target.value })} placeholder="Ex.: ISS, PIS, COFINS, CPRB…" className="col-span-2 sm:col-span-1" />
          <Input type="number" min={0} step="0.01" value={item.aliquotaPercent} onChange={(e) => atualizar(item.id, { aliquotaPercent: Number(e.target.value) })} />
          <Input value={item.observacao} onChange={(e) => atualizar(item.id, { observacao: e.target.value })} placeholder="Base de cálculo / incidência" className="col-span-2 sm:col-span-1" />
          <button type="button" onClick={() => remover(item.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-graphite-400 hover:bg-negative-50 hover:text-negative-600" aria-label="Remover">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Button variante="secundario" tamanho="sm" icone={<Plus className="h-3.5 w-3.5" />} onClick={adicionar}>
          Adicionar tributo
        </Button>
        {itens.length > 0 && (
          <span className={divergente ? 'text-sm font-medium text-negative-600' : 'text-sm text-graphite-600'}>
            Soma das alíquotas: <strong>{formatPercent(somaAliquotas)}</strong>
            {divergente && <> — diverge do percentual de tributos usado no cálculo ({formatPercent(tributosPercentTotal * 100)})</>}
          </span>
        )}
      </div>
    </div>
  );
}
