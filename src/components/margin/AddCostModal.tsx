import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { getCategorias } from '@/services/entidadesService';
import { criarCustoManual } from '@/services/marginService';
import { formatCurrency, parseValorBR } from '@/utils/format';
import type { Categoria, CustoContrato, RecorrenciaCusto, TipoCusto } from '@/types';

const TIPO_OPCOES: { value: TipoCusto; label: string }[] = [
  { value: 'realizado', label: 'Realizado' },
  { value: 'projetado', label: 'Projetado' },
];

const RECORRENCIA_OPCOES: { value: RecorrenciaCusto; label: string }[] = [
  { value: 'once', label: 'Único (um mês)' },
  { value: 'installment', label: 'Parcelado (compra em Nx)' },
  { value: 'fixed', label: 'Fixo mensal (recorrente)' },
];

interface AddCostModalProps {
  aberto: boolean;
  onFechar: () => void;
  contractId: string;
  onCriado: (custo: CustoContrato) => void;
}

export function AddCostModal({ aberto, onFechar, contractId, onCriado }: AddCostModalProps) {
  const { notificar } = useToast();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState('');
  const [tipo, setTipo] = useState<TipoCusto>('realizado');
  const [recorrencia, setRecorrencia] = useState<RecorrenciaCusto>('once');
  const [parcelas, setParcelas] = useState('12');
  const [recorrenciaFim, setRecorrenciaFim] = useState('');
  const [notas, setNotas] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    getCategorias().then((todas) => setCategorias(todas.filter((c) => c.tipo === 'despesa'))).catch(() => setCategorias([]));
    setDescricao('');
    setCategoria('');
    setFornecedor('');
    setValor('');
    setData('');
    setTipo('realizado');
    setRecorrencia('once');
    setParcelas('12');
    setRecorrenciaFim('');
    setNotas('');
  }, [aberto]);

  const parcelasNum = Number(parcelas) || 0;
  const valorNum = parseValorBR(valor) ?? 0;

  const salvar = async () => {
    if (!descricao.trim() || !valor || !data) {
      notificar({ titulo: 'Preencha os campos obrigatórios', descricao: 'Descrição, valor e data são obrigatórios.', variante: 'erro' });
      return;
    }
    if (valorNum <= 0) {
      notificar({ titulo: 'Valor inválido', descricao: 'Use um número como 1500 ou 1.500,00.', variante: 'erro' });
      return;
    }
    if (recorrencia === 'installment' && parcelasNum < 1) {
      notificar({ titulo: 'Informe as parcelas', descricao: 'Um custo parcelado precisa de ao menos 1 parcela.', variante: 'erro' });
      return;
    }
    setSalvando(true);
    try {
      const criado = await criarCustoManual(contractId, {
        description: descricao.trim(),
        category: categoria || undefined,
        supplierName: fornecedor.trim() || undefined,
        amount: valorNum,
        date: data,
        type: recorrencia === 'once' ? tipo : 'projetado',
        recurrence: recorrencia,
        installments: recorrencia === 'installment' ? parcelasNum : undefined,
        recurrenceEndDate: recorrencia === 'fixed' && recorrenciaFim ? recorrenciaFim : undefined,
        notes: notas.trim() || undefined,
      });
      onCriado(criado);
      onFechar();
      notificar({ titulo: 'Custo adicionado', descricao: criado.descricao, variante: 'sucesso' });
    } catch (e) {
      notificar({ titulo: 'Não foi possível salvar', descricao: e instanceof Error ? e.message : 'Tente novamente.', variante: 'erro' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Adicionar custo" tamanho="md">
      <div className="flex flex-col gap-4 p-6">
        <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
          Descrição *
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Material para obra" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            Categoria
            <Select opcoes={categorias.map((c) => ({ value: c.id, label: c.nome }))} placeholder="Selecione" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            Fornecedor
            <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
          Recorrência
          <Select opcoes={RECORRENCIA_OPCOES} value={recorrencia} onChange={(e) => setRecorrencia(e.target.value as RecorrenciaCusto)} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            {recorrencia === 'installment' ? 'Valor da parcela (R$) *' : recorrencia === 'fixed' ? 'Valor mensal (R$) *' : 'Valor (R$) *'}
            <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="1500,00" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            {recorrencia === 'once' ? 'Data *' : 'Mês inicial *'}
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </label>
        </div>

        {recorrencia === 'installment' && (
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            Nº de parcelas *
            <Input type="number" min={1} value={parcelas} onChange={(e) => setParcelas(e.target.value)} />
            {parcelasNum > 0 && valorNum > 0 && (
              <span className="text-[11px] font-normal text-graphite-400">
                {parcelasNum}x de {formatCurrency(valorNum)} = {formatCurrency(parcelasNum * valorNum)} no total
              </span>
            )}
          </label>
        )}

        {recorrencia === 'fixed' && (
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            Mês final (opcional)
            <Input type="date" value={recorrenciaFim} onChange={(e) => setRecorrenciaFim(e.target.value)} />
            <span className="text-[11px] font-normal text-graphite-400">Em branco = cobra todo mês até o fim do contrato / horizonte da projeção.</span>
          </label>
        )}

        {recorrencia === 'once' && (
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            Tipo
            <Select opcoes={TIPO_OPCOES} value={tipo} onChange={(e) => setTipo(e.target.value as TipoCusto)} />
          </label>
        )}

        <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
          Observação
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            className="rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm text-graphite-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <div className="mt-2 flex justify-end gap-2">
          <Button variante="secundario" onClick={onFechar}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Adicionar custo'}</Button>
        </div>
      </div>
    </Modal>
  );
}
