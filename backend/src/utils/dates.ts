/**
 * Datas de negócio são armazenadas como Date em UTC meia-noite e serializadas
 * na API como string 'YYYY-MM-DD' — o front-end trabalha 100% nesse formato e
 * exibe DD/MM/YYYY. Dados financeiros são brasileiros: a planilha traz DD/MM/YYYY.
 */

/** Cria um Date em UTC meia-noite a partir de ano/mês/dia. */
export function utcDate(year: number, month1to12: number, day: number): Date {
  return new Date(Date.UTC(year, month1to12 - 1, day, 0, 0, 0, 0));
}

/**
 * Interpreta um valor cru de data:
 *  - Date -> normalizado para UTC meia-noite
 *  - number -> serial de data do Excel (base 1899-12-30)
 *  - 'DD/MM/YYYY' | 'DD/MM/YY' | 'DD-MM-YYYY'
 *  - 'YYYY-MM-DD' (ISO, com ou sem horário)
 * Retorna null quando não reconhece.
 */
export function parseDate(input: unknown): Date | null {
  if (input === null || input === undefined || input === '') return null;

  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : utcDate(input.getUTCFullYear(), input.getUTCMonth() + 1, input.getUTCDate());
  }

  if (typeof input === 'number' && Number.isFinite(input)) {
    // Serial do Excel: dias desde 1899-12-30
    if (input > 20000 && input < 90000) {
      const ms = Math.round((input - 25569) * 86400 * 1000);
      const d = new Date(ms);
      return utcDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
    return null;
  }

  const s = String(input).trim();
  if (!s) return null;

  let m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(s);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += year < 70 ? 2000 : 1900;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return utcDate(year, month, day);
  }

  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    return utcDate(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime())
    ? null
    : utcDate(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, parsed.getUTCDate());
}

/** Date -> 'YYYY-MM-DD' (UTC). null-safe. */
export function toYMD(d: Date | null | undefined): string | null {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

/** Início do dia de hoje em UTC. */
export function todayUTC(): Date {
  const now = new Date();
  return utcDate(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
}

/** Soma dias a um Date (novo objeto, UTC). */
export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000);
}

/** 'YYYY-MM-DD' -> Date UTC meia-noite; qualquer outra coisa -> null. */
export function ymdToDate(ymd: string | undefined | null): Date | null {
  if (!ymd) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return parseDate(ymd);
  return utcDate(Number(m[1]), Number(m[2]), Number(m[3]));
}
