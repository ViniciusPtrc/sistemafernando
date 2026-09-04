import type { OrdenacaoState, PaginacaoState, RespostaPaginada } from '@/types';

export function ordenarLista<T>(itens: T[], ordenacao?: OrdenacaoState<Extract<keyof T, string>>): T[] {
  if (!ordenacao) return itens;
  const { campo, direcao } = ordenacao;

  return [...itens].sort((a, b) => {
    const valorA = a[campo];
    const valorB = b[campo];

    let comparacao = 0;
    if (typeof valorA === 'number' && typeof valorB === 'number') {
      comparacao = valorA - valorB;
    } else {
      comparacao = String(valorA).localeCompare(String(valorB), 'pt-BR');
    }

    return direcao === 'asc' ? comparacao : -comparacao;
  });
}

export function paginarLista<T>(itens: T[], paginacao: PaginacaoState): RespostaPaginada<T> {
  const inicio = (paginacao.pagina - 1) * paginacao.itensPorPagina;
  const fim = inicio + paginacao.itensPorPagina;

  return {
    dados: itens.slice(inicio, fim),
    total: itens.length,
    pagina: paginacao.pagina,
    itensPorPagina: paginacao.itensPorPagina,
  };
}

export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
