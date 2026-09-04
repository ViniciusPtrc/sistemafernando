import { normalizeText } from '../utils/slug';

export type CanonicalField =
  | 'partyName'
  | 'partyDocument'
  | 'documentNumber'
  | 'description'
  | 'category'
  | 'amount'
  | 'grossAmount'
  | 'dueDate'
  | 'paymentDate'
  | 'status'
  | 'paymentMethod'
  | 'notes';

/**
 * Sinônimos por campo. A ordem importa: campos mais específicos primeiro, para
 * que o passe "exato" resolva antes do passe "contém".
 */
const SYNONYMS: Record<CanonicalField, string[]> = {
  documentNumber: ['documento', 'n documento', 'no documento', 'nº documento', 'numero documento', 'num documento', 'numero do documento', 'nota', 'nota fiscal', 'nf', 'nfe', 'titulo', 'numero titulo', 'nosso numero'],
  partyDocument: ['cpf', 'cnpj', 'cpf/cnpj', 'cpf cnpj', 'documento do cliente', 'documento do fornecedor', 'documento fornecedor', 'doc cliente'],
  partyName: ['cliente', 'nome do cliente', 'razao social', 'fornecedor', 'nome do fornecedor', 'sacado', 'favorecido', 'beneficiario', 'nome'],
  grossAmount: ['valor bruto', 'valor original', 'vl bruto'],
  amount: ['valor', 'valor liquido', 'valor do titulo', 'valor titulo', 'valor documento', 'vl liquido', 'valor a pagar', 'valor a receber', 'valor total', 'total'],
  dueDate: ['vencimento', 'data vencimento', 'data de vencimento', 'dt vencimento', 'data do vencimento', 'venc'],
  paymentDate: ['data pagamento', 'data de pagamento', 'data recebimento', 'data de recebimento', 'data baixa', 'dt pagamento', 'liquidacao', 'pagamento', 'recebimento'],
  paymentMethod: ['forma de pagamento', 'forma pagamento', 'meio de pagamento', 'tipo de pagamento', 'forma'],
  category: ['categoria', 'plano de contas', 'classificacao', 'centro de custo'],
  description: ['descricao', 'historico', 'observacao do titulo', 'memo', 'referente'],
  status: ['status', 'situacao', 'situacao do titulo'],
  notes: ['observacao', 'observacoes', 'obs', 'anotacoes', 'comentario'],
};

const FIELD_ORDER = Object.keys(SYNONYMS) as CanonicalField[];

/** Dado o array de cabeçalhos da planilha, devolve {campoCanônico -> índice da coluna}. */
export function detectColumns(headers: (string | number | null | boolean)[]): Partial<Record<CanonicalField, number>> {
  const norm = headers.map((h) => normalizeText(h));
  const map: Partial<Record<CanonicalField, number>> = {};
  const usedCols = new Set<number>();

  // Passe 1: correspondência EXATA de cabeçalho (mais confiável).
  for (const field of FIELD_ORDER) {
    const idx = norm.findIndex((h, i) => h && !usedCols.has(i) && SYNONYMS[field].includes(h));
    if (idx !== -1) {
      map[field] = idx;
      usedCols.add(idx);
    }
  }

  // Passe 2: "contém" — só para sinônimos com >= 4 chars e casando por palavra.
  for (const field of FIELD_ORDER) {
    if (map[field] !== undefined) continue;
    const idx = norm.findIndex((h, i) => {
      if (!h || usedCols.has(i)) return false;
      return SYNONYMS[field].some((s) => s.length >= 4 && wordContains(h, s));
    });
    if (idx !== -1) {
      map[field] = idx;
      usedCols.add(idx);
    }
  }

  return map;
}

/** true se `s` aparece em `h` como palavra (início, fim, isolada ou string inteira). */
function wordContains(h: string, s: string): boolean {
  if (h === s) return true;
  return h.startsWith(`${s} `) || h.endsWith(` ${s}`) || h.includes(` ${s} `);
}

export function hasRecognizableHeader(headers: (string | number | null | boolean)[]): boolean {
  const cols = detectColumns(headers);
  // precisa no mínimo de nome da parte + documento + valor + vencimento
  return Boolean(cols.partyName !== undefined && cols.documentNumber !== undefined && cols.amount !== undefined && cols.dueDate !== undefined);
}
