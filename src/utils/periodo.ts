import type { PeriodoPreset, RangeData } from '@/types';
import { addDays } from './random';

export const PERIODO_LABELS: Record<PeriodoPreset, string> = {
  hoje: 'Hoje',
  esta_semana: 'Esta semana',
  este_mes: 'Este mês',
  mes_anterior: 'Mês anterior',
  ultimos_3_meses: 'Últimos 3 meses',
  personalizado: 'Personalizado',
};

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
    case 'personalizado':
    default:
      return { inicio: addDays(isoHoje, -30), fim: isoHoje };
  }
}
