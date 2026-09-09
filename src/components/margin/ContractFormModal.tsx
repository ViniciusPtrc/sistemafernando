import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { criarContrato, atualizarContrato } from '@/services/marginService';
import { parseValorBR } from '@/utils/format';
import type { Company, Contrato, StatusContrato } from '@/types';

const STATUS_OPCOES: { value: StatusContrato; label: string }[] = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'encerrado', label: 'Encerrado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'outro', label: 'Outro' },
];

interface ContractFormModalProps {
  aberto: boolean;
  onFechar: () => void;
  onSalvo: (contrato: Contrato) => void;
  companies: Company[];
  companyIdPadrao?: string;
  contrato?: Contrato | null;
}

const VAZIO = {
  companyId: '',
  number: '',
  customerName: '',
  customerDocument: '',
  contractedValue: '',
  monthlyRevenue: '',
  startDate: '',
  endDate: '',
  status: 'ativo' as StatusContrato,
  notes: '',
};

export function ContractFormModal({ aberto, onFechar, onSalvo, companies, companyIdPadrao, contrato }: ContractFormModalProps) {
  const { notificar } = useToast();
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    if (contrato) {
      setForm({
        companyId: contrato.companyId,
        number: contrato.numero,
        customerName: contrato.clienteNome,
        customerDocument: contrato.clienteDocumento,
        contractedValue: contrato.valorContratadoCents ? String(contrato.valorContratadoCents / 100) : '',
        monthlyRevenue: contrato.faturamentoMensalCents ? String(contrato.faturamentoMensalCents / 100) : '',
        startDate: contrato.dataInicio,
        endDate: contrato.dataFim ?? '',
        status: contrato.status,
        notes: contrato.observacoes,
      });
    } else {
      setForm({ ...VAZIO, companyId: companyIdPadrao && companyIdPadrao !== 'all' ? companyIdPadrao : companies[0]?.id ?? '' });
    }
  }, [aberto, contrato, companyIdPadrao, companies]);

  const salvar = async () => {
    if (!form.companyId || !form.number.trim() || !form.customerName.trim() || !form.startDate) {
      notificar({ titulo: 'Preencha os campos obrigatórios', descricao: 'Empresa, número, cliente e data de início são obrigatórios.', variante: 'erro' });
      return;
    }
    if (form.contractedValue.trim() && parseValorBR(form.contractedValue) === undefined) {
      notificar({ titulo: 'Valor contratado inválido', descricao: 'Use um número como 500000 ou 500.000,00.', variante: 'erro' });
      return;
    }
    if (form.monthlyRevenue.trim() && parseValorBR(form.monthlyRevenue) === undefined) {
      notificar({ titulo: 'Faturamento mensal inválido', descricao: 'Use um número como 15000 ou 15.000,00.', variante: 'erro' });
      return;
    }
    setSalvando(true);
    try {
      const dados = {
        companyId: form.companyId,
        number: form.number.trim(),
        customerName: form.customerName.trim(),
        customerDocument: form.customerDocument.trim() || undefined,
        contractedValue: form.contractedValue.trim() ? parseValorBR(form.contractedValue) : undefined,
        monthlyRevenue: form.monthlyRevenue.trim() ? parseValorBR(form.monthlyRevenue) : undefined,
        startDate: form.startDate,
        endDate: form.endDate || null,
        status: form.status,
        notes: form.notes.trim() || undefined,
      };
      const salvo = contrato ? await atualizarContrato(contrato.id, dados) : await criarContrato(dados);
      onSalvo(salvo);
      onFechar();
      notificar({ titulo: contrato ? 'Contrato atualizado' : 'Contrato criado', descricao: `${salvo.numero} — ${salvo.clienteNome}`, variante: 'sucesso' });
    } catch (e) {
      notificar({ titulo: 'Não foi possível salvar', descricao: e instanceof Error ? e.message : 'Tente novamente.', variante: 'erro' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={contrato ? 'Editar contrato' : 'Novo contrato'} tamanho="md">
      <div className="flex flex-col gap-4 p-6">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            Empresa *
            <Select
              opcoes={companies.map((c) => ({ value: c.id, label: c.name }))}
              value={form.companyId}
              onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            Número do contrato *
            <Input value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} placeholder="2026-015" />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
          Cliente *
          <Input value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} placeholder="Nome do cliente" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
          CNPJ/CPF do cliente
          <Input value={form.customerDocument} onChange={(e) => setForm((f) => ({ ...f, customerDocument: e.target.value }))} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            Valor contratado (R$) — opcional
            <Input value={form.contractedValue} onChange={(e) => setForm((f) => ({ ...f, contractedValue: e.target.value }))} placeholder="500.000,00" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            Status
            <Select opcoes={STATUS_OPCOES} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as StatusContrato }))} />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
          Faturamento mensal (R$)
          <Input value={form.monthlyRevenue} onChange={(e) => setForm((f) => ({ ...f, monthlyRevenue: e.target.value }))} placeholder="15000,00" />
          <span className="text-[11px] font-normal text-graphite-400">Valor fixo usado na projeção dos próximos meses (sem reajuste).</span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            Data de início *
            <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
            Data de término
            <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium text-graphite-500">
          Observações
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm text-graphite-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <div className="mt-2 flex justify-end gap-2">
          <Button variante="secundario" onClick={onFechar}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
        </div>
      </div>
    </Modal>
  );
}
