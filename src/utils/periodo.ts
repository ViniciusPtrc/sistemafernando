import type { PeriodoPreset, RangeData } from '@/types';
import { addDays } from './random';

export const PERIODO_LABELS: Record<PeriodoPreset, string> = {
  hoje: 'Hoje',
  esta_semana: 'Esta semana',
  este_mes: 'Este mês',
  mes_anterior: 'Mês anterior',
  ultimos_3_meses: 'Últimos 3 meses',
  ultimos_6_meses: 'Últimos 6 meses',
  ultimos_12_meses: 'Últimos 12 meses',
  ultimos_24_meses: 'Últimos 24 meses',
  ultimos_36_meses: 'Últimos 36 meses',
  este_ano: 'Este ano',
  ano_anterior: 'Ano anterior',
  personalizado: 'Personalizado',
};

const MESES_POR_PRESET: Partial<Record<PeriodoPreset, number>> = {
  ultimos_3_meses: 3,
  ultimos_6_meses: 6,
  ultimos_12_meses: 12,
  ultimos_24_meses: 24,
  ultimos_36_meses: 36,
};

/** Primeiro dia do mês, N meses atrás (ISO 'YYYY-MM-DD'). Ancorado em mês, não em "N × 30 dias". */
function inicioDeMesesAtras(hoje: Date, meses: number): string {
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1 - (meses - 1);
  const data = new Date(Date.UTC(ano, mes - 1, 1));
  return data.toISOString().slice(0, 10);
}

export function rangePadraoListagem(): RangeData {
  const hoje = new Date().toISOString().slice(0, 10);
  return { inicio: addDays(hoje, -150), fim: addDays(hoje, 65) };
}

export function calcularRangePreset(preset: PeriodoPreset): RangeData {
  const hoje = new Date();
  const isoHoje = hoje.toISOString().slice(0, 10);

  switch (preset) {
    case 'hoje':
      return { inicio: isoHoje, fim: isoHoje };
    case 'esta_semana': {
      const diaSemana = hoje.getDay();
      const inicio = addDays(isoHoje, -diaSemana);
      return { inicio, fim: isoHoje };
    }
    case 'este_mes': {
      const inicio = `${isoHoje.slice(0, 7)}-01`;
      return { inicio, fim: isoHoje };
    }
    case 'mes_anterior': {
      const primeiroDiaMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const ultimoDiaMesAnterior = new Date(primeiroDiaMesAtual.getTime() - 1);
      const primeiroDiaMesAnterior = new Date(ultimoDiaMesAnterior.getFullYear(), ultimoDiaMesAnterior.getMonth(), 1);
      return {
        inicio: primeiroDiaMesAnterior.toISOString().slice(0, 10),
        fim: ultimoDiaMesAnterior.toISOString().slice(0, 10),
      };
    }
    case 'ultimos_3_meses':
      return { inicio: addDays(isoHoje, -90), fim: isoHoje };
    case 'ultimos_6_meses':
    case 'ultimos_12_meses':
    case 'ultimos_24_meses':
    case 'ultimos_36_meses':
      return { inicio: inicioDeMesesAtras(hoje, MESES_POR_PRESET[preset]!), fim: isoHoje };
    case 'este_ano':
      return { inicio: `${hoje.getFullYear()}-01-01`, fim: isoHoje };
    case 'ano_anterior': {
      const anoAnterior = hoje.getFullYear() - 1;
      return { inicio: `${anoAnterior}-01-01`, fim: `${anoAnterior}-12-31` };
    }
    case 'personalizado':
    default:
      return { inicio: addDays(isoHoje, -30), fim: isoHoje };
  }
}
