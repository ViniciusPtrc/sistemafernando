import type { Cliente } from '@/types';
import { normalizarTexto } from '@/utils/listQuery';
import { clientesLocTudo } from './clientesLocTudo';

const clientesSinteticos: Cliente[] = [
  { id: 'cli-1', nome: 'Empresa Alpha Ltda.', documento: '12.345.678/0001-90', segmento: 'Indústria' },
  { id: 'cli-2', nome: 'Comercial Brasil Ltda.', documento: '23.456.789/0001-11', segmento: 'Varejo' },
  { id: 'cli-3', nome: 'Tecnologia XPTO Ltda.', documento: '34.567.891/0001-22', segmento: 'Tecnologia' },
  { id: 'cli-4', nome: 'Grupo Central', documento: '45.678.912/0001-33', segmento: 'Serviços' },
  { id: 'cli-5', nome: 'Construtora Horizonte', documento: '56.789.123/0001-44', segmento: 'Construção' },
  { id: 'cli-6', nome: 'Distribuidora São Paulo S.A.', documento: '67.891.234/0001-55', segmento: 'Distribuição' },
  { id: 'cli-7', nome: 'Nova Era Alimentos', documento: '78.912.345/0001-66', segmento: 'Alimentício' },
  { id: 'cli-8', nome: 'Metalúrgica Progresso Ltda.', documento: '89.123.456/0001-77', segmento: 'Indústria' },
  { id: 'cli-9', nome: 'Global Logística e Transportes', documento: '91.234.567/0001-88', segmento: 'Logística' },
  { id: 'cli-10', nome: 'Grupo Vitória Comércio', documento: '12.987.654/0001-99', segmento: 'Varejo' },
  { id: 'cli-11', nome: 'Consultoria Prisma', documento: '23.876.543/0001-10', segmento: 'Serviços' },
  { id: 'cli-12', nome: 'Farmacêutica Bem Estar', documento: '34.765.432/0001-21', segmento: 'Saúde' },
  { id: 'cli-13', nome: 'Buffet Requinte Eventos', documento: '45.654.321/0001-32', segmento: 'Eventos' },
  { id: 'cli-14', nome: 'Cerimonial Instante Perfeito', documento: '56.543.210/0001-43', segmento: 'Eventos' },
  { id: 'cli-15', nome: 'Casa de Festas Recanto Verde', documento: '67.432.109/0001-54', segmento: 'Eventos' },
  { id: 'cli-16', nome: 'Rede de Farmácias Vitalle', documento: '78.321.098/0001-65', segmento: 'Varejo' },
  { id: 'cli-17', nome: 'Papelaria e Presentes Arco-Íris', documento: '89.210.987/0001-76', segmento: 'Comércio' },
  { id: 'cli-18', nome: 'Móveis e Decorações Bela Casa', documento: '91.109.876/0001-87', segmento: 'Comércio' },
];

export const clientes: Cliente[] = [...clientesSinteticos, ...clientesLocTudo];

/**
 * Busca um cliente existente pelo nome (comparação normalizada) ou cria um novo
 * registro em memória. Usado pela importação real de planilhas, onde o arquivo
 * pode trazer clientes que ainda não existem na base local.
 */
export function obterOuCriarCliente(nome: string): Cliente {
  const alvo = normalizarTexto(nome);
  const existente = clientes.find((cliente) => normalizarTexto(cliente.nome) === alvo);
  if (existente) return existente;

  const novo: Cliente = {
    id: `cli-imp-${Date.now().toString(36)}-${clientes.length}`,
    nome,
    documento: '—',
    segmento: 'Importado',
  };
  clientes.push(novo);
  return novo;
}
