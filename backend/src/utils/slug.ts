const DIACRITICS = /[̀-ͯ]/g;

/** Normaliza texto: minúsculo, sem acento, espaços colapsados. */
export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Gera um slug estável (kebab-case ASCII) a partir de um nome. */
export function slugify(value: unknown): string {
  return (
    normalizeText(value)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'sem-nome'
  );
}

/** Colapsa espaços e apara — para nomes vindos de planilha. */
export function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}
