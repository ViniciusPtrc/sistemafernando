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
