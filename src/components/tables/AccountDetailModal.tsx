import { Check, Circle, Clock, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { EventoTimeline, StatusConta } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDateLong } from '@/utils/format';
import { FORMA_PAGAMENTO_LABELS } from '@/utils/status';
import type { FormaPagamento } from '@/types';

export interface DetalheConta {
  empresaNome?: string;
  entidadeLabel: string;
  entidadeNome: string;
  documento: string;
  descricao: string;
  categoriaNome: string;
  valor: number;
  vencimento: string;
  dataPagamento: string | null;
  status: StatusConta;
  formaPagamento: FormaPagamento;
  observacoes?: string;
  criadoEm: string;
  /** Valor original do documento, antes de retenções — exibido apenas quando difere do valor líquido. */
  valorBruto?: number;
  /** Canal de cobrança (Carteira Própria, Banco do Brasil, etc.), quando existir. */
  canalCobranca?: string;
  /** Código interno do título no sistema de origem, quando existir. */
  codigoTitulo?: string;
}

function construirTimeline(conta: DetalheConta): EventoTimeline[] {
  const hoje = new Date().toISOString().slice(0, 10);
  const vencimentoStatus: EventoTimeline['status'] =
    conta.status === 'pago' || conta.vencimento >= hoje ? 'concluido' : 'atrasado';

  return [
    { titulo: 'Criado', data: conta.criadoEm, status: 'concluido' },
    { titulo: 'Vencimento', data: conta.vencimento, status: vencimentoStatus },
    {
      titulo: 'Pagamento',
      data: conta.dataPagamento,
      status: conta.dataPagamento ? 'concluido' : 'pendente',
    },
  ];
}

export function AccountDetailModal({
  aberto,
  onFechar,
  conta,
  onExcluir,
  excluindo = false,
}: {
  aberto: boolean;
  onFechar: () => void;
  conta: DetalheConta | null;
  /** Quando informado, exibe o botão "Excluir lançamento" no rodapé do modal. */
  onExcluir?: () => void;
  excluindo?: boolean;
}) {
  if (!conta) return null;
  const timeline = construirTimeline(conta);

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={conta.documento} tamanho="lg">
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {conta.empresaNome && (
              <p className="mb-1 inline-flex items-center rounded-full bg-graphite-100 px-2 py-0.5 text-xs font-medium text-graphite-600">
                {conta.empresaNome}
              </p>
            )}
            <p className="text-xs font-medium uppercase tracking-wide text-graphite-400">{conta.entidadeLabel}</p>
            <p className="mt-0.5 text-lg font-semibold text-graphite-900">{conta.entidadeNome}</p>
          </div>
          <StatusBadge status={conta.status} />
        </div>

        <div className="rounded-xl bg-graphite-50 p-5">
          <p className="text-xs font-medium text-graphite-500">Valor</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-graphite-900">{formatCurrency(conta.valor)}</p>
          {conta.valorBruto !== undefined && Math.abs(conta.valorBruto - conta.valor) > 0.01 && (
            <p className="mt-1 text-xs text-graphite-500">
              Valor bruto do documento: {formatCurrency(conta.valorBruto)} (retenções/ajustes de{' '}
              {formatCurrency(conta.valorBruto - conta.valor)})
            </p>
          )}
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Documento" valor={conta.documento} />
          <Campo label="Categoria" valor={conta.categoriaNome} />
          <Campo label="Vencimento" valor={formatDateLong(conta.vencimento)} />
          <Campo label="Data de Pagamento" valor={conta.dataPagamento ? formatDateLong(conta.dataPagamento) : 'Não pago'} />
          <Campo label="Forma de Pagamento" valor={FORMA_PAGAMENTO_LABELS[conta.formaPagamento]} />
          <Campo label="Descrição" valor={conta.descricao} />
          {conta.canalCobranca && <Campo label="Canal de Cobrança" valor={conta.canalCobranca} />}
          {conta.codigoTitulo && <Campo label="Código do Título" valor={conta.codigoTitulo} />}
        </dl>

        {conta.observacoes && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-graphite-400">Observações</p>
            <p className="mt-1.5 rounded-lg bg-graphite-50 p-3 text-sm text-graphite-600">{conta.observacoes}</p>
          </div>
        )}

        <div>
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-graphite-400">Linha do tempo</p>
          <ol className="flex flex-col gap-0">
            {timeline.map((evento, indice) => (
              <li key={evento.titulo} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={clsx(
                      'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full',
                      evento.status === 'concluido' && 'bg-positive-100 text-positive-600',
                      evento.status === 'pendente' && 'bg-graphite-100 text-graphite-400',
                      evento.status === 'atrasado' && 'bg-negative-100 text-negative-600',
                    )}
                  >
                    {evento.status === 'concluido' ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : evento.status === 'atrasado' ? (
                      <Clock className="h-3.5 w-3.5" />
                    ) : (
                      <Circle className="h-2 w-2 fill-current" />
                    )}
                  </span>
                  {indice < timeline.length - 1 && <span className="my-0.5 h-8 w-px flex-1 bg-graphite-200" />}
                </div>
                <div className="pb-6">
                  <p className="text-sm font-medium text-graphite-800">{evento.titulo}</p>
                  <p className="text-xs text-graphite-400">
                    {evento.data ? formatDateLong(evento.data) : 'Pendente'}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {onExcluir && (
        <div className="flex items-center justify-between gap-3 border-t border-graphite-200 bg-graphite-50/60 px-6 py-4">
          <p className="text-xs text-graphite-400">
            A exclusão é permanente. Se o título ainda estiver na planilha de origem, uma nova importação vai recriá-lo.
          </p>
          <Button variante="perigo" tamanho="sm" icone={<Trash2 className="h-4 w-4" />} disabled={excluindo} onClick={onExcluir}>
            {excluindo ? 'Excluindo…' : 'Excluir lançamento'}
          </Button>
        </div>
      )}
    </Modal>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-graphite-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-graphite-800">{valor}</dd>
    </div>
  );
}
