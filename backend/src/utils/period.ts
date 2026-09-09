import { utcDate, todayUTC, ymdToDate } from './dates';

/**
 * Presets de período do módulo de Margem de Contratos (§1/§22 do spec). Ancorados
 * em início de mês (não em "N × 30 dias") para que a evolução mensal sempre
 * devolva exatamente N barras.
 */
export const MARGIN_PERIOD_PRESETS = [
  'ultimos_3_meses',
  'ultimos_6_meses',
  'ultimos_12_meses',
  'ultimos_24_meses',
  'ultimos_36_meses',
  'este_ano',
  'ano_anterior',
  'personalizado',
] as const;
export type MarginPeriodPreset = (typeof MARGIN_PERIOD_PRESETS)[number];

export interface DateRange {
  from: Date;
  to: Date;
}

const MONTHS_BY_PRESET: Partial<Record<MarginPeriodPreset, number>> = {
  ultimos_3_meses: 3,
  ultimos_6_meses: 6,
  ultimos_12_meses: 12,
  ultimos_24_meses: 24,
  ultimos_36_meses: 36,
};

/** Resolve um preset (ou personalizado com from/to) para um range de datas UTC. */
export function resolvePeriod(
  preset: MarginPeriodPreset,
  custom?: { from?: string; to?: string },
): DateRange {
  const now = todayUTC();

  const months = MONTHS_BY_PRESET[preset];
  if (months) {
    const from = utcDate(now.getUTCFullYear(), now.getUTCMonth() + 1 - (months - 1), 1);
    return { from, to: now };
  }

  if (preset === 'este_ano') {
    return { from: utcDate(now.getUTCFullYear(), 1, 1), to: now };
  }

  if (preset === 'ano_anterior') {
    const year = now.getUTCFullYear() - 1;
    return { from: utcDate(year, 1, 1), to: utcDate(year, 12, 31) };
  }

  // personalizado
  const from = ymdToDate(custom?.from) ?? utcDate(now.getUTCFullYear(), now.getUTCMonth() + 1 - 2, 1);
  const to = ymdToDate(custom?.to) ?? now;
  return { from, to };
}

export function isMarginPeriodPreset(v: unknown): v is MarginPeriodPreset {
  return (MARGIN_PERIOD_PRESETS as readonly string[]).includes(String(v));
}

/* ------------------------------- Helpers de mês ------------------------------- */

/** 'YYYY-MM' de uma data UTC. */
export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Primeiro dia do mês (UTC) N meses após `d` (N negativo = antes). */
export function addMonths(d: Date, n: number): Date {
  return utcDate(d.getUTCFullYear(), d.getUTCMonth() + 1 + n, 1);
}

/** Lista de N chaves 'YYYY-MM' consecutivas a partir do mês de `start` (inclusive). */
export function monthKeysFrom(start: Date, count: number): string[] {
  const first = utcDate(start.getUTCFullYear(), start.getUTCMonth() + 1, 1);
  return Array.from({ length: count }, (_, i) => monthKey(addMonths(first, i)));
}

/** Chaves 'YYYY-MM' de `from` até `to` (ambos inclusive, por mês). */
export function monthKeysBetween(from: Date, to: Date): string[] {
  const out: string[] = [];
  let cursor = utcDate(from.getUTCFullYear(), from.getUTCMonth() + 1, 1);
  const end = utcDate(to.getUTCFullYear(), to.getUTCMonth() + 1, 1);
  while (cursor <= end) {
    out.push(monthKey(cursor));
    cursor = addMonths(cursor, 1);
  }
  return out;
}
