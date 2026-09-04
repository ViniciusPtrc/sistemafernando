import type { ImportSource } from '../../models/enums';
import type { AdapterResult, ImportKind } from '../types/NormalizedFinancialRecord';

export type { AdapterResult };

export interface AdapterContext {
  companyObjectId: string;
  kind: ImportKind;
  sourceFile: string;
}

/**
 * Contrato de um adaptador de fonte. Cada fonte de arquivo (sistema antigo,
 * TOTVS, ...) implementa um adaptador; o `ImporterFactory` escolhe qual usar a
 * partir de `{ source, kind }`. Nenhuma regra específica de fonte vaza para fora
 * de `imports/adapters/`.
 */
export interface SourceAdapter {
  id: ImportSource;
  supports(kind: ImportKind): boolean;
  analyze(buffer: Buffer, originalName: string, ctx: AdapterContext): Promise<AdapterResult>;
}

/** Helper para adaptadores devolverem um resultado "vazio" com um erro claro. */
export function emptyAdapterResult(
  columns: string[],
  errors: { row: number; message: string }[],
  missingRequired: string[] = [],
): AdapterResult {
  return { candidates: [], errors, columns, previewRows: [], mapping: [], missingRequired, warnings: [] };
}
