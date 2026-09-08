import { HttpError } from '../utils/http';
import type { ImportSource } from '../models/enums';
import type { ImportKind } from './types/NormalizedFinancialRecord';
import type { SourceAdapter } from './adapters/types';
import { legacyAdapter } from './adapters/legacyAdapter';
import { totvsReceivableAdapter } from './adapters/totvsReceivableAdapter';
import { totvsPayableAdapter } from './adapters/totvsPayableAdapter';

const ADAPTERS: SourceAdapter[] = [legacyAdapter, totvsReceivableAdapter, totvsPayableAdapter];

const BY_SOURCE: Record<ImportSource, SourceAdapter[]> = {
  legacy: [legacyAdapter],
  totvs: [totvsReceivableAdapter, totvsPayableAdapter],
};

/**
 * Escolhe o adaptador para `{ source, kind }`. Toda a lógica específica de fonte
 * vive dentro dos adaptadores — aqui só roteamos.
 */
export function resolveAdapter(source: ImportSource, kind: ImportKind): SourceAdapter {
  const candidates = BY_SOURCE[source] ?? BY_SOURCE.legacy;
  const adapter = candidates.find((a) => a.supports(kind));
  if (!adapter) {
    throw new HttpError(
      400,
      `A fonte "${source}" ainda não suporta importação de ${kind === 'receivable' ? 'Contas a Receber' : 'Contas a Pagar'}.`,
    );
  }
  return adapter;
}

export function listAdapters(): SourceAdapter[] {
  return ADAPTERS;
}
