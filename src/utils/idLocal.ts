/**
 * Id temporário para linhas novas ainda não salvas (chave do React). Nunca é
 * enviado à API — o backend gera o `_id` de verdade ao persistir. Evita
 * `crypto.randomUUID`, que pode faltar fora de um contexto seguro (LAN/HTTP).
 */
let contador = 0;

export function gerarIdLocal(prefixo = 'novo'): string {
  contador += 1;
  return `${prefixo}-${Date.now()}-${contador}`;
}
