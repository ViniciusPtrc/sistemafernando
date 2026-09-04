import { IMPORT_SOURCES, type ImportSource } from '../models/enums';

export { IMPORT_SOURCES };
export type { ImportSource };

/** Rótulos exibidos ao usuário para cada fonte de importação. */
export const IMPORT_SOURCE_LABELS: Record<ImportSource, string> = {
  legacy: 'Sistema antigo',
  totvs: 'TOTVS',
};

/** Normaliza um valor cru de `source` vindo do form-data para uma fonte válida. */
export function coerceImportSource(raw: unknown): ImportSource {
  const value = String(raw ?? '').trim().toLowerCase();
  return (IMPORT_SOURCES as readonly string[]).includes(value)
    ? (value as ImportSource)
    : 'legacy';
}

export function isImportSource(value: unknown): value is ImportSource {
  return (IMPORT_SOURCES as readonly string[]).includes(String(value));
}
