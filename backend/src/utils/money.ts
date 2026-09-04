/**
 * Estratégia monetária do sistema: TUDO em centavos inteiros no banco e na API.
 * O front-end converte para reais na borda. Nunca fazer soma/subtração de dinheiro
 * com float — somar sempre os `*Cents` inteiros e dividir por 100 só na exibição.
 */

/**
 * Converte um valor "cru" (número, ou string pt-BR / en-US) para centavos inteiros.
 * Aceita: 1250.5 · "1.250,50" · "1250,50" · "1250.50" · "1250" · "R$ 1.250,50" · "(1.250,50)".
 * Retorna null quando não há como interpretar um número.
 */
export function parseMoneyToCents(input: unknown): number | null {
  if (input === null || input === undefined) return null;

  if (typeof input === 'number') {
    return Number.isFinite(input) ? Math.round(input * 100) : null;
  }

  const original = String(input).trim();
  if (!original) return null;

  const negative = /^\(.*\)$/.test(original) || original.replace(/[^\d,.-]/g, '').startsWith('-');

  // mantém apenas dígitos, ponto e vírgula
  const s = original.replace(/[^\d.,]/g, '');
  if (!s) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  // o separador decimal é o ÚLTIMO ponto ou vírgula que aparece
  const decimalPos = Math.max(lastComma, lastDot);

  let intDigits: string;
  let fracDigits: string;

  if (decimalPos === -1) {
    intDigits = s;
    fracDigits = '';
  } else {
    const decChar = s[decimalPos];
    const afterCount = s.length - decimalPos - 1;
    // ".000" / ",000" com 3 dígitos e sem outro separador antes = agrupamento de milhar, não decimal
    const otherSepBefore = s.slice(0, decimalPos).search(/[.,]/) !== -1;
    if (afterCount === 3 && !otherSepBefore) {
      intDigits = s.replace(/[.,]/g, '');
      fracDigits = '';
    } else {
      intDigits = s.slice(0, decimalPos).replace(/[.,]/g, '');
      fracDigits = s.slice(decimalPos + 1).replace(/[.,]/g, '');
    }
    void decChar;
  }

  if (!intDigits) intDigits = '0';
  if (!/^\d+$/.test(intDigits)) return null;
  if (fracDigits && !/^\d+$/.test(fracDigits)) return null;

  fracDigits = (fracDigits + '00').slice(0, 2);
  const cents = Number(intDigits) * 100 + Number(fracDigits);
  if (!Number.isFinite(cents)) return null;
  return negative ? -cents : cents;
}

/** Reais (float) já confiável -> centavos. */
export function reaisToCents(reais: number): number {
  return Math.round(reais * 100);
}

/** Centavos -> reais (float). */
export function centsToReais(cents: number): number {
  return Math.round(cents) / 100;
}

/** Formata centavos como moeda pt-BR: 125050 -> "R$ 1.250,50". */
export function formatBRL(cents: number): string {
  return (Math.round(cents) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
