export interface Company {
  id: string;
  name: string;
  shortName: string;
  document: string;
  status: 'ativo' | 'inativo';
  color: string;
}

export type SelectedCompany = string;

export interface CompanyMetrics {
  companyId: string;
  companyName: string;
  shortName: string;
  color: string;
  aReceber: number;
  aPagar: number;
  recebido: number;
  pago: number;
  saldoProjetado: number;
  vencidoReceber: number;
  vencidoPagar: number;
  quantidadeReceber: number;
  quantidadePagar: number;
  taxaInadimplencia: number;
}
