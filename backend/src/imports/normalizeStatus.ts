import { normalizeText } from '../utils/slug';
import type { EntryStatus } from '../models/enums';

/**
 * §11 — Traduz o status textual de uma conta a receber (qualquer fonte) para o
 * padrão interno. Mapa EXPLÍCITO: nada de heurística frouxa.
 *
 * Retorno:
 *  - `{ status }`                — reconhecido.
 *  - `{ status: null }`          — sem texto de status (o adaptador decide pelo
 *                                  contexto: datas/saldo).
 *  - `{ status: null, unknown }` — texto presente mas fora do mapa. O chamador
 *                                  NÃO deve importar a linha silenciosamente:
 *                                  registra erro "Status desconhecido".
 */
export interface StatusResolution {
  status: EntryStatus | null;
  unknown?: string;
}

const STATUS_MAP: Record<string, EntryStatus> = {};
const register = (status: EntryStatus, ...labels: string[]) => {
  for (const label of labels) STATUS_MAP[normalizeText(label)] = status;
};

register(
  'paid',
  'pago',
  'baixado',
  'liquidado',
  'quitado',
  'recebido',
  'recebido total',
  'baixa total',
  'pago total',
);
register(
  'pending',
  'em aberto',
  'aberto',
  'a receber',
  'pendente',
  'a vencer',
  'em ser',
  'nao vencido',
  'previsto',
);
register('overdue', 'vencido', 'em atraso', 'atrasado', 'inadimplente', 'vencida');
register(
  'canceled',
  'cancelado',
  'cancelada',
  'baixado por cancelamento',
  'baixa por cancelamento',
  'baixa cancelamento',
  'estornado',
  'estorno',
);

export function normalizeReceivableStatus(raw: string | null | undefined): StatusResolution {
  const key = normalizeText(raw);
  if (!key) return { status: null };
  const mapped = STATUS_MAP[key];
  if (mapped) return { status: mapped };
  return { status: null, unknown: String(raw).trim() };
}
