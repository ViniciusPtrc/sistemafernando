export interface Cliente {
  id: string;
  nome: string;
  documento: string;
  segmento?: string;
}

export interface Fornecedor {
  id: string;
  nome: string;
  documento: string;
  segmento?: string;
}

export interface Categoria {
  id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  cor: string;
}
