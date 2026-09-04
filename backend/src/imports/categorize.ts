import { normalizeText } from '../utils/slug';

/**
 * Heurística leve de classificação de despesa a partir do histórico do título
 * (o relatório do sistema antigo não traz categoria estruturada). Usa os ids de
 * categoria já existentes no seed (`cat-d-*`). Sem match => "Outras Despesas".
 */
export interface CategoriaDespesa {
  id: string;
  nome: string;
}

const REGRAS: { re: RegExp; id: string; nome: string }[] = [
  { re: /(imposto|tribut|\bdas\b|\binss\b|\bfgts\b|\biss\b|\birpj\b|\bcsll\b|refis|dctf|simples|\btll\b|\btaxa|guia|darf)/, id: 'cat-d-3', nome: 'Impostos e Tributos' },
  { re: /(folha|salario|\brescis|\bferias\b|13\.? ?salario|adiantamento|vale transporte|vale refeicao|pro ?labore|retirada socio)/, id: 'cat-d-2', nome: 'Folha de Pagamento' },
  { re: /(aluguel|locacao imovel|condominio|iptu)/, id: 'cat-d-4', nome: 'Aluguel e Condomínio' },
  { re: /(internet|telefone|telefonia|\bvivo\b|\bclaro\b|\btim\b|\boi\b|link dedicado|banda larga)/, id: 'cat-d-5', nome: 'Telefonia e Internet' },
  { re: /(energia|\bluz\b|\bcoelba\b|\bcemig\b|\benel\b|\bceb\b|eletric)/, id: 'cat-d-6', nome: 'Energia Elétrica' },
  { re: /(software|licenca|sistema|hospedagem|servidor|\bcloud\b|\bti\b|tecnologia)/, id: 'cat-d-7', nome: 'Tecnologia e Software' },
  { re: /(marketing|publicidade|anuncio|midia|trafego|impulsionamento)/, id: 'cat-d-8', nome: 'Marketing' },
  { re: /(manutencao|conserto|reparo|assistencia tecnica)/, id: 'cat-d-9', nome: 'Manutenção' },
  { re: /(honorario|contabil|advocat|prestacao de servico|pagto prest|consultoria|assessoria|cartorio|registro)/, id: 'cat-d-1', nome: 'Fornecedores' },
];

export function categorizeDespesa(historico: string | null | undefined): CategoriaDespesa {
  const texto = normalizeText(historico);
  for (const regra of REGRAS) {
    if (regra.re.test(texto)) return { id: regra.id, nome: regra.nome };
  }
  return { id: 'cat-d-10', nome: 'Outras Despesas' };
}
