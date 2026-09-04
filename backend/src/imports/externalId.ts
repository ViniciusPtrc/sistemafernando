import { createHash } from 'node:crypto';
import { normalizeText } from '../utils/slug';

export interface ExternalIdInput {
  companyId: string; // ObjectId string
  type: 'receivable' | 'payable';
  /**
   * Identificador do título: `codigoTitulo` do ERP quando disponível (sempre
   * único, mesmo quando `documento` vem genérico/placeholder tipo "1--1"),
   * senão `documentNumber`.
   */
  identifier: string;
}

/**
 * Identificador determinístico para deduplicação (§10). Reimportar o mesmo
 * título gera sempre o mesmo id -> upsert em vez de duplicar, mesmo que o
 * valor tenha mudado (juros, correção monetária, desconto). Valor/vencimento
 * NÃO entram no hash de propósito: são exatamente os campos que o reimport
 * precisa poder atualizar sem gerar um título novo.
 */
export function buildExternalId(input: ExternalIdInput): string {
  const parts = [input.companyId, input.type, normalizeText(input.identifier)];
  return createHash('sha1').update(parts.join('|')).digest('hex');
}
