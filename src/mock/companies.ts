import type { Company } from '@/types';

export const ALL_COMPANIES = 'all';

export const companies: Company[] = [
  {
    id: 'loc-tudo',
    name: 'LOC TUDO',
    shortName: 'LOC TUDO',
    document: '12.345.678/0001-01',
    status: 'ativo',
    color: '#2563eb',
  },
  {
    id: 'alugue-tudo-evento',
    name: 'ALUGUE TUDO EVENTO',
    shortName: 'ALUGUE EVENTO',
    document: '23.456.789/0001-02',
    status: 'ativo',
    color: '#7c3aed',
  },
  {
    id: 'alugue-tudo-comercio',
    name: 'ALUGUE TUDO COMÉRCIO',
    shortName: 'ALUGUE COMÉRCIO',
    document: '34.567.890/0001-03',
    status: 'ativo',
    color: '#0d9488',
  },
];

export function getCompanyById(id: string): Company | undefined {
  return companies.find((company) => company.id === id);
}
