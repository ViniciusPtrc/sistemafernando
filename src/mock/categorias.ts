import type { Categoria } from '@/types';

export const categoriasReceita: Categoria[] = [
  { id: 'cat-r-1', nome: 'Venda de Produtos', tipo: 'receita', cor: '#2563eb' },
  { id: 'cat-r-2', nome: 'Prestação de Serviços', tipo: 'receita', cor: '#059669' },
  { id: 'cat-r-3', nome: 'Consultoria', tipo: 'receita', cor: '#7c3aed' },
  { id: 'cat-r-4', nome: 'Locação', tipo: 'receita', cor: '#0891b2' },
  { id: 'cat-r-5', nome: 'Outras Receitas', tipo: 'receita', cor: '#64748b' },
];

export const categoriasDespesa: Categoria[] = [
  { id: 'cat-d-1', nome: 'Fornecedores', tipo: 'despesa', cor: '#dc2626' },
  { id: 'cat-d-2', nome: 'Folha de Pagamento', tipo: 'despesa', cor: '#ea580c' },
  { id: 'cat-d-3', nome: 'Impostos e Tributos', tipo: 'despesa', cor: '#d97706' },
  { id: 'cat-d-4', nome: 'Aluguel e Condomínio', tipo: 'despesa', cor: '#ca8a04' },
  { id: 'cat-d-5', nome: 'Telefonia e Internet', tipo: 'despesa', cor: '#65a30d' },
  { id: 'cat-d-6', nome: 'Energia Elétrica', tipo: 'despesa', cor: '#0d9488' },
  { id: 'cat-d-7', nome: 'Tecnologia e Software', tipo: 'despesa', cor: '#0369a1' },
  { id: 'cat-d-8', nome: 'Marketing', tipo: 'despesa', cor: '#7e22ce' },
  { id: 'cat-d-9', nome: 'Manutenção', tipo: 'despesa', cor: '#a21caf' },
  { id: 'cat-d-10', nome: 'Outras Despesas', tipo: 'despesa', cor: '#57534e' },
];

export const categorias: Categoria[] = [...categoriasReceita, ...categoriasDespesa];

export const formasPagamento = [
  'boleto',
  'pix',
  'transferencia',
  'cartao_credito',
  'cartao_debito',
  'dinheiro',
  'cheque',
] as const;
