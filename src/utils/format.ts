export function formatCurrency(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatCurrencyCompact(valor: number): string {
  const abs = Math.abs(valor);
  if (abs >= 1_000_000) {
    return `R$ ${(valor / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  }
  if (abs >= 1_000) {
    return `R$ ${(valor / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  }
  return formatCurrency(valor);
}

export function formatDate(data: string | null | undefined): string {
  if (!data) return '—';
  const [ano, mes, dia] = data.split('-');
  if (!ano || !mes || !dia) return '—';
  return `${dia}/${mes}/${ano}`;
}

export function formatDateLong(data: string | null | undefined): string {
  if (!data) return '—';
  const date = new Date(`${data}T00:00:00`);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatPercent(valor: number, casasDecimais = 1): string {
  return `${valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  })}%`;
}

export function formatNumber(valor: number): string {
  return valor.toLocaleString('pt-BR');
}

/**
 * Interpreta um valor monetário digitado no formato brasileiro e devolve o número
 * em reais (ou `undefined` se não der para entender). Aceita "R$ 15.000,00",
 * "15.000,00", "15000,5", "15000.50" e "15000".
 */
export function parseValorBR(entrada: string): number | undefined {
  if (typeof entrada !== 'string') return undefined;
  let s = entrada.trim().replace(/[^\d.,-]/g, '');
  if (!s) return undefined;

  const temVirgula = s.includes(',');
  const temPonto = s.includes('.');

  if (temVirgula && temPonto) {
    // "15.000,00" → ponto é separador de milhar, vírgula é decimal
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (temVirgula) {
    // "15000,50" → vírgula é decimal
    s = s.replace(',', '.');
  } else if (temPonto) {
    const partes = s.split('.');
    // "1.500" (grupos de 3 dígitos) → separador de milhar; "1500.50" → decimal
    if (partes.length > 2 || partes[partes.length - 1].length === 3) s = partes.join('');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function diasEntre(dataInicial: string, dataFinal: string): number {
  const inicio = new Date(`${dataInicial}T00:00:00`);
  const fim = new Date(`${dataFinal}T00:00:00`);
  return Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
}

export function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}
