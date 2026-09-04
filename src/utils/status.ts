import type { FormaPagamento, StatusConta } from '@/types';

export const STATUS_LABELS: Record<StatusConta, string> = {
  em_aberto: 'Em aberto',
  pago: 'Pago',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
  recebido: 'Recebido',
  a_vencer: 'A vencer',
};

export const STATUS_STYLES: Record<StatusConta, string> = {
  em_aberto: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200',
  pago: 'bg-positive-50 text-positive-700 ring-1 ring-inset ring-positive-100',
  vencido: 'bg-negative-50 text-negative-700 ring-1 ring-inset ring-negative-100',
  cancelado: 'bg-graphite-100 text-graphite-500 ring-1 ring-inset ring-graphite-200',
  recebido: 'bg-positive-50 text-positive-700 ring-1 ring-inset ring-positive-100',
  a_vencer: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200',
};

export const STATUS_DOT: Record<StatusConta, string> = {
  em_aberto: 'bg-brand-500',
  pago: 'bg-positive-500',
  vencido: 'bg-negative-500',
  cancelado: 'bg-graphite-400',
  recebido: 'bg-positive-500',
  a_vencer: 'bg-brand-500',
};

export const FORMA_PAGAMENTO_LABELS: Record<FormaPagamento, string> = {
  boleto: 'Boleto',
  pix: 'Pix',
  transferencia: 'Transferência',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  dinheiro: 'Dinheiro',
  cheque: 'Cheque',
};
