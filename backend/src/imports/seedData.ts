/** Dados de referência para o seed — espelham src/mock/* do front-end. */

export const COMPANIES = [
  {
    name: 'LOC TUDO',
    slug: 'loc-tudo',
    shortName: 'LOC TUDO',
    document: '12.345.678/0001-01',
    color: '#2563eb',
    openingBalanceCents: 25_000_00,
  },
  {
    name: 'ALUGUE TUDO EVENTO',
    slug: 'alugue-tudo-evento',
    shortName: 'ALUGUE EVENTO',
    document: '23.456.789/0001-02',
    color: '#7c3aed',
    openingBalanceCents: 12_000_00,
  },
  {
    name: 'ALUGUE TUDO COMÉRCIO',
    slug: 'alugue-tudo-comercio',
    shortName: 'ALUGUE COMÉRCIO',
    document: '34.567.890/0001-03',
    color: '#0d9488',
    openingBalanceCents: 8_000_00,
  },
];

export const CATEGORIES = [
  { _id: 'cat-r-1', nome: 'Venda de Produtos', tipo: 'receita', cor: '#2563eb' },
  { _id: 'cat-r-2', nome: 'Prestação de Serviços', tipo: 'receita', cor: '#059669' },
  { _id: 'cat-r-3', nome: 'Consultoria', tipo: 'receita', cor: '#7c3aed' },
  { _id: 'cat-r-4', nome: 'Locação', tipo: 'receita', cor: '#0891b2' },
  { _id: 'cat-r-5', nome: 'Outras Receitas', tipo: 'receita', cor: '#64748b' },
  { _id: 'cat-d-1', nome: 'Fornecedores', tipo: 'despesa', cor: '#dc2626' },
  { _id: 'cat-d-2', nome: 'Folha de Pagamento', tipo: 'despesa', cor: '#ea580c' },
  { _id: 'cat-d-3', nome: 'Impostos e Tributos', tipo: 'despesa', cor: '#d97706' },
  { _id: 'cat-d-4', nome: 'Aluguel e Condomínio', tipo: 'despesa', cor: '#ca8a04' },
  { _id: 'cat-d-5', nome: 'Telefonia e Internet', tipo: 'despesa', cor: '#65a30d' },
  { _id: 'cat-d-6', nome: 'Energia Elétrica', tipo: 'despesa', cor: '#0d9488' },
  { _id: 'cat-d-7', nome: 'Tecnologia e Software', tipo: 'despesa', cor: '#0369a1' },
  { _id: 'cat-d-8', nome: 'Marketing', tipo: 'despesa', cor: '#7e22ce' },
  { _id: 'cat-d-9', nome: 'Manutenção', tipo: 'despesa', cor: '#a21caf' },
  { _id: 'cat-d-10', nome: 'Outras Despesas', tipo: 'despesa', cor: '#57534e' },
] as const;

export const CATEGORIAS_RECEITA = CATEGORIES.filter((c) => c.tipo === 'receita');
export const CATEGORIAS_DESPESA = CATEGORIES.filter((c) => c.tipo === 'despesa');

export const PAYMENT_METHODS = [
  'boleto',
  'pix',
  'transferencia',
  'cartao_credito',
  'cartao_debito',
  'dinheiro',
  'cheque',
] as const;

export const CLIENTES_SINTETICOS = [
  { nome: 'Empresa Alpha Ltda.', documento: '12.345.678/0001-90' },
  { nome: 'Comercial Brasil Ltda.', documento: '23.456.789/0001-11' },
  { nome: 'Tecnologia XPTO Ltda.', documento: '34.567.891/0001-22' },
  { nome: 'Grupo Central', documento: '45.678.912/0001-33' },
  { nome: 'Construtora Horizonte', documento: '56.789.123/0001-44' },
  { nome: 'Distribuidora São Paulo S.A.', documento: '67.891.234/0001-55' },
  { nome: 'Nova Era Alimentos', documento: '78.912.345/0001-66' },
  { nome: 'Metalúrgica Progresso Ltda.', documento: '89.123.456/0001-77' },
  { nome: 'Global Logística e Transportes', documento: '91.234.567/0001-88' },
  { nome: 'Grupo Vitória Comércio', documento: '12.987.654/0001-99' },
  { nome: 'Consultoria Prisma', documento: '23.876.543/0001-10' },
  { nome: 'Farmacêutica Bem Estar', documento: '34.765.432/0001-21' },
  { nome: 'Buffet Requinte Eventos', documento: '45.654.321/0001-32' },
  { nome: 'Cerimonial Instante Perfeito', documento: '56.543.210/0001-43' },
  { nome: 'Casa de Festas Recanto Verde', documento: '67.432.109/0001-54' },
  { nome: 'Rede de Farmácias Vitalle', documento: '78.321.098/0001-65' },
  { nome: 'Papelaria e Presentes Arco-Íris', documento: '89.210.987/0001-76' },
  { nome: 'Móveis e Decorações Bela Casa', documento: '91.109.876/0001-87' },
];

export const FORNECEDORES = [
  { nome: 'Microsoft Brasil', documento: '01.234.567/0001-10' },
  { nome: 'TOTVS', documento: '02.345.678/0001-21' },
  { nome: 'Vivo Empresas', documento: '03.456.789/0001-32' },
  { nome: 'Algar Telecom', documento: '04.567.891/0001-43' },
  { nome: 'Fornecedor ABC Materiais', documento: '05.678.912/0001-54' },
  { nome: 'Energisa Distribuidora', documento: '06.789.123/0001-65' },
  { nome: 'Sabesp Saneamento', documento: '07.891.234/0001-76' },
  { nome: 'Localiza Frotas', documento: '08.912.345/0001-87' },
  { nome: 'Contabilidade Souza & Associados', documento: '09.123.456/0001-98' },
  { nome: 'Gráfica Print Express', documento: '10.234.567/0001-09' },
  { nome: 'Amazon Web Services Brasil', documento: '11.345.678/0001-19' },
  { nome: 'Transportadora Rota Segura', documento: '12.456.789/0001-20' },
  { nome: 'Locadora de Estruturas Palco Show', documento: '13.567.891/0001-31' },
  { nome: 'Iluminação e Som Master Eventos', documento: '14.678.912/0001-42' },
  { nome: 'Buffet e Catering Sabor Fino', documento: '15.789.123/0001-53' },
  { nome: 'Distribuidora de Bebidas Rio Claro', documento: '16.891.234/0001-64' },
  { nome: 'Manutenção Predial Fix Serviços', documento: '17.912.345/0001-75' },
  { nome: 'Seguradora Proteção Total', documento: '18.123.456/0001-86' },
];

export const DESCRICOES_RECEBER = [
  'Venda de mercadorias - pedido',
  'Prestação de serviços mensais',
  'Consultoria financeira',
  'Locação de equipamentos',
  'Fornecimento de materiais',
  'Contrato de manutenção',
  'Serviços de implantação',
  'Venda à vista',
  'Parcela de contrato anual',
  'Licenciamento de software',
];

export const DESCRICOES_PAGAR = [
  'Compra de materiais e insumos',
  'Mensalidade de serviço contratado',
  'Fatura de telefonia e internet',
  'Conta de energia elétrica',
  'Honorários contábeis',
  'Licença de software corporativo',
  'Locação de veículos',
  'Serviços de manutenção predial',
  'Campanha de marketing digital',
  'Frete e transporte de mercadorias',
];

export const VOLUME_RECEBER = { 'alugue-tudo-evento': 92, 'alugue-tudo-comercio': 76 } as Record<string, number>;
export const SEED_RECEBER = { 'alugue-tudo-evento': 20260901, 'alugue-tudo-comercio': 20260915 } as Record<string, number>;

export const VOLUME_PAGAR = { 'loc-tudo': 86, 'alugue-tudo-evento': 66, 'alugue-tudo-comercio': 54 } as Record<string, number>;
export const SEED_PAGAR = { 'loc-tudo': 20260829, 'alugue-tudo-evento': 20260907, 'alugue-tudo-comercio': 20260921 } as Record<string, number>;
