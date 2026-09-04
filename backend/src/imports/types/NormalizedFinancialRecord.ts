/**
 * Modelo interno padrão (§4 / §31). Independentemente da fonte do arquivo
 * (sistema antigo, TOTVS, ...), todo adaptador produz este mesmo registro. É o
 * que a validação consome e o que vira documento no MongoDB.
 *
 * Hoje o tipo é exatamente o `EntryCandidate` do pipeline existente — mantido
 * como alias para não duplicar a forma e para que legado e TOTVS convirjam no
 * mesmo ponto. Se um dia o candidato divergir do registro persistido, este
 * arquivo passa a ser o contrato e o `EntryCandidate` se adapta a ele.
 */
import type { EntryCandidate, ImportKind, NormalizeResult, RowError } from '../normalize';

export type NormalizedFinancialRecord = EntryCandidate;
export type { ImportKind, NormalizeResult, RowError };

/** Um par "coluna do arquivo → campo do sistema" exibido no preview (§16). */
export interface FieldMapping {
  sourceColumn: string;
  field: string;
}

/** Resultado de um adaptador de fonte: registros normalizados + metadados de UI. */
export interface AdapterResult extends NormalizeResult {
  /** Mapeamento coluna-origem → campo-sistema identificado pelo adaptador. */
  mapping: FieldMapping[];
  /** Campos obrigatórios que o adaptador não conseguiu localizar (§19). */
  missingRequired: string[];
  /** Avisos não-bloqueantes para o usuário revisar. */
  warnings: RowError[];
}
